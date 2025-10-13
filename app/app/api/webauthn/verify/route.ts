// Next.js 14 App Router – WebAuthn Registration Verify (v3: Bearer fallback)
export const runtime = "nodejs";

import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

import {
  deriveRpID,
  expectedOrigins,
  readChallengeCookie,
  clearChallengeCookie,
  extractRegistrationCredential,
  toBase64Url,
} from "@/lib/webauthn";

import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );
}

function readBearer(): string | null {
  const auth = headers().get("authorization") || headers().get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  try {
    const hdrs = headers();
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

    const supabase = supabaseServer();
    // Prefer cookie session, but also accept Authorization: Bearer <access_token>
    const bearer = readBearer();
    let user = null as any;
    if (bearer) {
      const { data, error } = await supabase.auth.getUser(bearer);
      if (!error) user = data.user;
    }
    if (!user) {
      const { data: d2 } = await supabase.auth.getUser();
      user = d2?.user ?? null;
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

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

    const supabase2 = supabase; // alias

    // 1) Upsert credential
    const { error: upsertErr } = await supabase2
      .from("webauthn_credentials")
      .upsert(
        {
          user_id: user.id,
          credential_id: credIdStr,
          public_key: pubKeyStr,
          counter: counter ?? 0,
          device_type: credentialDeviceType ?? null,
          backed_up: credentialBackedUp ?? null,
          transports: credentialTransports ?? null,
        },
        { onConflict: "credential_id" }
      );
    if (upsertErr) {
      console.error("[webauthn/verify] credential upsert failed", upsertErr);
      return NextResponse.json({ ok: false, error: "DB upsert failed" }, { status: 500 });
    }

    // 2) Flip user flags and append cred id
    const { data: urow, error: urowErr } = await supabase2
      .from("users")
      .select("passkey_cred_ids")
      .eq("id", user.id)
      .single();
    if (urowErr) {
      console.error("[webauthn/verify] user row load failed", urowErr);
      return NextResponse.json({ ok: false, error: "User row missing" }, { status: 500 });
    }

    const ids: string[] = Array.isArray(urow?.passkey_cred_ids) ? urow.passkey_cred_ids : [];
    if (!ids.includes(credIdStr)) ids.push(credIdStr);

    const { error: userUpdateErr } = await supabase2
      .from("users")
      .update({ passkey_enabled: true, passkey_cred_ids: ids })
      .eq("id", user.id);
    if (userUpdateErr) {
      console.error("[webauthn/verify] users update failed", userUpdateErr);
      return NextResponse.json({ ok: false, error: "User update failed" }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, credential_id: credIdStr });
    clearChallengeCookie(res);
    return res;
  } catch (err: any) {
    console.error("[webauthn/verify] error", err);
    return NextResponse.json({ ok: false, error: "Verification exception", detail: String(err?.message || err) }, { status: 500 });
  }
}
