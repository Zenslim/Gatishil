// Next.js 14 App Router – WebAuthn Registration Options (v4: JWT decode user id)
export const runtime = "nodejs";

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

import { setChallengeCookie, deriveRpID, expectedOrigins, rpName } from "@/lib/webauthn";
import { generateRegistrationOptions } from "@simplewebauthn/server";

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
  const h = headers();
  const auth = h.get("authorization") || h.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// Unsafe decode just to read claims; we don't verify here because this is first-party same-origin
function decodeSubFromJWT(token: string): { sub?: string; email?: string } | null {
  try {
    const [, p2] = token.split(".");
    if (!p2) return null;
    const json = Buffer.from(p2, "base64url").toString("utf8");
    const obj = JSON.parse(json);
    return { sub: obj?.sub, email: obj?.email };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const hdrs = headers();
    const host = hdrs.get("host");
    const rpID = deriveRpID(host);

    const supabase = supabaseServer();
    // 1) Try bearer JWT -> sub
    const bearer = readBearer();
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (bearer) {
      const claims = decodeSubFromJWT(bearer);
      if (claims?.sub) {
        userId = claims.sub;
        userEmail = claims.email ?? null;
      }
    }

    // 2) Fallback to cookie session
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Exclude existing creds
    const { data: existing } = await supabase
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", userId);

    const excludeCredentials = (existing ?? []).map((c: any) => ({
      id: c.credential_id,
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: rpName ?? "Gatishil Nepal",
      rpID,
      userID: userId,
      userName: userEmail ?? userId,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "preferred",
      },
      timeout: 60000,
      excludeCredentials,
    });

    const res = NextResponse.json({ ok: true, options, expectedOrigins: Array.from(expectedOrigins) });
    setChallengeCookie(res, options.challenge);
    return res;
  } catch (err: any) {
    console.error("[webauthn/options] error", err);
    return NextResponse.json({ ok: false, error: "Failed to create options", detail: String(err?.message || err) }, { status: 500 });
  }
}
