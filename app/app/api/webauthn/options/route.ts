// Next.js 14 App Router – WebAuthn Registration Options (v3: Bearer fallback)
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
  const auth = headers().get("authorization") || headers().get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  try {
    const hdrs = headers();
    const host = hdrs.get("host");
    const rpID = deriveRpID(host);

    const supabase = supabaseServer();
    // Prefer cookie session, but allow Authorization: Bearer <access_token>
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

    // Exclude existing credentials to prevent dupes
    const { data: existing } = await supabase
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", user.id);

    const excludeCredentials = (existing ?? []).map((c: any) => ({
      id: c.credential_id,
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: rpName ?? "Gatishil Nepal",
      rpID,
      userID: user.id,
      userName: user.email ?? user.id,
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
