// app/api/otp/send/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { sha256Hex } from "@/lib/server/hash";

// ── Aakash SMS (replace with your real HTTP call) ───────────────────────────────
async function sendAakashSMS(toE164: string, message: string) {
  // TODO: Implement actual HTTP call using AAKASH_SMS_API_KEY and your sender ID.
  // This stub simulates success.
  return { ok: true };
}

const NEPAL_E164 = /^\+977\d{9,10}$/;
function rand6() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone, email, redirectTo } = body || {};

  // ── PHONE: custom OTP via Aakash (NOT Supabase SMS) ───────────────────────────
  if (typeof phone === "string") {
    if (!NEPAL_E164.test(phone)) {
      return NextResponse.json(
        { ok: false, field: "phone", error: "INVALID_PHONE", message: "Nepal-only: +977XXXXXXXXXX" },
        { status: 400 }
      );
    }

    const code = rand6();
    const codeHash = sha256Hex(code);
    const ttlMinutes = 5;
    const resendSeconds = 30;

    const { error: upErr } = await supabaseAdmin
      .from("phone_otps")
      .upsert({
        e164_phone: phone,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
        attempts_left: 5,
        resend_after: new Date(Date.now() + resendSeconds * 1000).toISOString(),
      }, { onConflict: "e164_phone" });

    if (upErr) {
      return NextResponse.json({ ok: false, error: "DB_ERROR", message: upErr.message }, { status: 500 });
    }

    const text = `Your Gatishil code is ${code}. It expires in ${ttlMinutes} minutes.`;
    const sent = await sendAakashSMS(phone, text);
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: "SMS_SEND_FAILED" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, mode: "phone_otp_sent", resend_after_seconds: resendSeconds }, { status: 200 });
  }

  // ── EMAIL: keep Supabase OTP EXACTLY (unchanged logic) ────────────────────────
  if (typeof email === "string" && email.includes("@")) {
    const sb = supabaseAnon();
    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo.length > 0
        ? redirectTo
        : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/onboard?src=join`;

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo },
    });

    if (error) {
      return NextResponse.json(
        { ok: false, field: "email", error: "EMAIL_OTP_SEND_FAILED", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mode: "email_otp_sent" }, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Provide { phone } or { email }." }, { status: 400 });
}
