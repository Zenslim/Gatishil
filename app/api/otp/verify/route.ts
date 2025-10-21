import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reuse public URL + anon key (client-like) to verify OTP and mint a session.
function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, anon, { auth: { persistSession: false } });
}

type Body = Partial<{
  // phone OTP
  phone: string;
  code: string;

  // email OTP (kept intact; if you already have a separate email verify, ignore)
  email: string;
  token: string;
  type: "email" | "recovery" | "invite" | "magiclink";
}>;

// Very light Nepal gate (same format you send to Supabase in /send)
const NEPAL_E164 = /^\+977\d{9,10}$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // 1) PHONE OTP: verify with Supabase (it generated the code in /send)
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

      // This is the key: Supabase generated the OTP, so it can verify it and mint a session.
      const { data, error } = await sb.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });

      if (error) {
        // Common errors: "OTP expired" (5 min TTL), "Token has expired or is invalid", etc.
        return NextResponse.json(
          { ok: false, error: "PHONE_OTP_VERIFY_FAILED", message: error.message },
          { status: 401 }
        );
      }

      // Depending on supabase-js version, verifyOtp may already return a session in `data.session`.
      // If not present, fetch it right away.
      const session = data?.session ?? (await sb.auth.getSession()).data.session ?? null;

      if (!session?.access_token) {
        return NextResponse.json(
          {
            ok: false,
            error: "SESSION_MISSING",
            message: "Verified but no session. Retry or check project auth settings.",
          },
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
          // keep your flow exactly: after verify → onboard
          next: "/onboard?src=otp",
        },
        { status: 200 }
      );
    }

    // 2) EMAIL OTP path (left intact). If you already handle email verify elsewhere, you can remove this block.
    if (typeof body.email === "string" && typeof body.token === "string") {
      const email = body.email.trim();
      const token = body.token.trim();
      const sb = supabaseAnon();

      const { data, error } = await sb.auth.verifyOtp({
        email,
        token,
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
          { ok: false, error: "SESSION_MISSING", message: "Verified but no session" },
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
