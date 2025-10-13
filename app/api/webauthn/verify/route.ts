export const runtime = "nodejs";

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

import {
  clearChallengeCookie,
  deriveRpID,
  expectedOrigins,
  extractRegistrationCredential,
  readChallengeCookie,
  toBase64Url,
} from "@/lib/webauthn";

class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
  }
}

type JwtPayload = {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
  user_metadata?: { email?: unknown } | null;
};

type SupabaseIdentity = {
  userId: string;
  email: string | null;
};

function normalizeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return normalized + "=".repeat(padding);
}

function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError();
  }

  const payloadSegment = normalizeBase64Url(parts[1]);

  try {
    let json: string;
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(payloadSegment, "base64").toString("utf-8");
    } else if (typeof atob === "function") {
      const binary = atob(payloadSegment);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    } else {
      throw new Error("No base64 decoder available");
    }

    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as JwtPayload) : {};
  } catch (error) {
    throw new UnauthorizedError();
  }
}

function assertTokenNotExpired(payload: JwtPayload) {
  const { exp } = payload;
  if (typeof exp === "number") {
    if (exp * 1000 <= Date.now()) {
      throw new UnauthorizedError();
    }
  } else if (typeof exp === "string") {
    const asNumber = Number(exp);
    if (!Number.isNaN(asNumber) && asNumber * 1000 <= Date.now()) {
      throw new UnauthorizedError();
    }
  }
}

function extractIdentity(payload: JwtPayload): SupabaseIdentity {
  const rawSub = payload.sub;
  if (typeof rawSub !== "string" || rawSub.length === 0) {
    throw new UnauthorizedError();
  }

  const primaryEmail = typeof payload.email === "string" ? payload.email : null;
  const metadataEmail =
    payload.user_metadata && typeof payload.user_metadata.email === "string"
      ? payload.user_metadata.email
      : null;

  return {
    userId: rawSub,
    email: primaryEmail || metadataEmail || null,
  };
}

function resolveSupabaseIdentity(token: string): SupabaseIdentity {
  const payload = decodeJwtPayload(token);
  assertTokenNotExpired(payload);
  return extractIdentity(payload);
}

function resolveAccessToken(
  hdrs: Headers,
  cookieStore: ReturnType<typeof cookies>,
): string {
  const authHeader = hdrs.get("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const cookieToken = cookieStore.get("sb-access-token")?.value;
  if (cookieToken && cookieToken.length > 0) {
    return cookieToken;
  }

  const legacyCookie = cookieStore.get("supabase-auth-token")?.value;
  if (legacyCookie) {
    try {
      const parsed = JSON.parse(legacyCookie);
      const legacyToken = parsed?.access_token;
      if (typeof legacyToken === "string" && legacyToken.length > 0) {
        return legacyToken;
      }
    } catch (error) {
      console.error("[webauthn/verify] failed to parse supabase-auth-token", error);
    }
  }

  throw new UnauthorizedError();
}

function createSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(req: Request) {
  const hdrs = headers();
  const cookieStore = cookies();

  try {
    const accessToken = resolveAccessToken(hdrs, cookieStore);
    const { userId } = resolveSupabaseIdentity(accessToken);

    const host = hdrs.get("host");
    const cookieHeader = hdrs.get("cookie");
    const rpID = deriveRpID(host);
    const origins = Array.from(expectedOrigins);

    const payload = await req.json();
    const credential: RegistrationResponseJSON | null = extractRegistrationCredential(payload);
    if (!credential) {
      return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
    }

    const challenge = readChallengeCookie(cookieHeader);
    if (!challenge) {
      return NextResponse.json({ ok: false, error: "Missing challenge" }, { status: 400 });
    }

    const supabase = createSupabaseClient(accessToken);

    const verification = await verifyRegistrationResponse({
      expectedChallenge: challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      response: credential,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 400 });
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      credentialTransports,
    } = verification.registrationInfo;

    const credIdStr = toBase64Url(credentialID);
    const pubKeyStr = toBase64Url(credentialPublicKey);

    const { error: upsertError } = await supabase
      .from("webauthn_credentials")
      .upsert(
        {
          user_id: userId,
          credential_id: credIdStr,
          public_key: pubKeyStr,
          counter: counter ?? 0,
          device_type: credentialDeviceType ?? null,
          backed_up: credentialBackedUp ?? null,
          transports: credentialTransports ?? null,
        },
        { onConflict: "credential_id" },
      );

    if (upsertError) {
      console.error("[webauthn/verify] credential upsert failed", upsertError);
      return NextResponse.json({ ok: false, error: "DB upsert failed" }, { status: 500 });
    }

    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("passkey_cred_ids")
      .eq("id", userId)
      .single();

    if (userRowError) {
      console.error("[webauthn/verify] user row load failed", userRowError);
      return NextResponse.json({ ok: false, error: "User row missing" }, { status: 500 });
    }

    const ids: string[] = Array.isArray(userRow?.passkey_cred_ids) ? userRow.passkey_cred_ids : [];
    if (!ids.includes(credIdStr)) ids.push(credIdStr);

    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ passkey_enabled: true, passkey_cred_ids: ids })
      .eq("id", userId);

    if (userUpdateError) {
      console.error("[webauthn/verify] users update failed", userUpdateError);
      return NextResponse.json({ ok: false, error: "User update failed" }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true, credential_id: credIdStr });
    clearChallengeCookie(response);
    return response;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    console.error("[webauthn/verify] error", error);
    return NextResponse.json(
      { ok: false, error: "Verification exception" },
      { status: 500 },
    );
  }
}
