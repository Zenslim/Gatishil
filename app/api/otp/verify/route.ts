import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use the same phone format you used when generating the code (must match exactly)
const NEPAL_E164 = /^\+977\d{9,10}$/;

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false } });
}

type Body = Partial<{
  phone: string;            // for SMS verification
  code: string;             // 6-digit code
  email: string;            // (kept intact for email verification if you use it here)
  token: string;
  type: "email" | "recovery" | "invite" | "magiclink";
}>;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // ─────────────────────────────────────────────
    // PHONE: verify against Supabase OTP (single SoT)
    // ─────────────────────────────────────────────
    if (typeof body.phone === "string" && typeof body.code === "string") {
      const phone = body.phone.trim();
      const code = body.code.trim();

      if (!NEPAL_E164.test(phone)) {
        return NextResponse.json(
          { ok: false, error: "INVALID_PHONE", message: "Nepal-only: +977XXXXXXXXXX" },
          { status: 400 }
        );
      }
      if (code.length !== 6) {
        return NextResponse.json(
          { ok: false, error: "INVALID_CODE", message: "6-digit code required" },
          { status: 400 }
        );
      }

      const sb = supabaseAnon();

      // Supabase generated the OTP (you saw it in auth.otps), so let Supabase verify it.
      const { data, error } = await sb.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });

      if (error) {
        // If code is wrong or expired, Supabase returns the correct failure (401)
        return NextResponse.json(
          { ok: false, error: "PHONE_OTP_VERIFY_FAILED", message: error.message },
          { status: 401 }
        );
      }

      // In recent supabase-js, verifyOtp typically returns a session; if not, fetch it immediately.
      const session = data?.session ?? (await sb.auth.getSession()).data.session ?? null;
      if (!session?.access_token) {
        return NextResponse.json(
          { ok: false, error: "SESSION_MISSING", message: "Verified but no session returned" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: session.token_type,
          expires_in: session.expires_in,
          next: "/onboard?src=otp",
        },
        { status: 200 }
      );
    }

    // ─────────────────────────────────────────────
    // EMAIL (optional here; untouched semantics)
    // ─────────────────────────────────────────────
    if (typeof body.email === "string" && typeof body.token === "string") {
      const sb = supabaseAnon();
      const { data, error } = await sb.auth.verifyOtp({
        email: body.email.trim(),
        token: body.token.trim(),
        type: body.type ?? "email",
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: "EMAIL_OTP_VERIFY_FAILED", message: error.message },
          { status: 401 }
        );
      }
      const session = data?.session ?? (await sb.auth.getSession()).data.session ?? null;
      if (!session?.access_token) {
        return NextResponse.json(
          { ok: false, error: "SESSION_MISSING", message: "Verified but no session returned" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          ok: true,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: session.token_type,
          expires_in: session.expires_in,
          next: "/onboard?src=otp",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Provide { phone, code } or { email, token }." },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED", message: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
