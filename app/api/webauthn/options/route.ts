// Next.js 14 App Router – WebAuthn Registration Options
export const runtime = "nodejs";

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase"; // adjust if needed

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

export async function POST() {
  try {
    const hdrs = headers();
    const host = hdrs.get("host");
    const rpID = deriveRpID(host);

    const supabase = supabaseServer();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Avoid duplicate registration on the same account
    const { data: existing, error: credErr } = await supabase
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", user.id);
    if (credErr) {
      console.error("[webauthn/options] credential preload error", credErr);
    }

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
