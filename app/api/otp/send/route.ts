import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ───────────────── env helpers ─────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // for email branch (unchanged)

// Aakash settings (set these in Vercel)
const AAKASH_BASE_URL = process.env.AAKASH_SMS_BASE_URL!; // e.g. "https://sms.aakash.com.np/api/v1/sms/send"
const AAKASH_API_KEY = process.env.AAKASH_SMS_API_KEY!;   // your key
const AAKASH_SENDER_ID = process.env.AAKASH_SMS_SENDER_ID || ""; // if your account requires it
const AAKASH_DEBUG_RETURN_CODE = process.env.AAKASH_DEBUG_RETURN_CODE === "true"; // return code in response (non-prod only)

// ───────────────── clients ─────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

// ───────────────── utils ─────────────────
const NEPAL_E164 = /^\+977\d{9,10}$/;
const ttlMinutes = 5;
const resendSeconds = 30;

function rand6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// Real Aakash HTTP call. Adjust payload/headers to your provider’s spec.
async function sendAakashSMS(toE164: string, message: string): Promise<{ ok: boolean; status?: number; body?: any; text?: string; }> {
  if (!AAKASH_BASE_URL || !AAKASH_API_KEY) {
    return { ok: false, body: { error: "Missing AAKASH env" } };
  }

  try {
    const res = await fetch(AAKASH_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Many Nepal gateways use Bearer; if yours needs a different header (e.g. "X-API-Key"), change this:
        Authorization: `Bearer ${AAKASH_API_KEY}`,
      },
      body: JSON.stringify({
        to: [toE164],            // some APIs accept a single string; others an array—adjust if needed
        message,
        senderId: AAKASH_SENDER_ID || undefined,
      }),
    });

    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* plain text */ }

    // If your provider returns a specific success field, check it here.
    if (res.ok) return { ok: true, status: res.status, body, text };
    return { ok: false, status: res.status, body, text };
  } catch (e: any) {
    return { ok: false, body: { error: e?.message || "fetch_failed" } };
  }
}

// ───────────────── handler ─────────────────
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

    // Enforce resend window
    const { data: existing } = await admin
      .from("phone_otps")
      .select("resend_after")
      .eq("e164_phone", phone)
      .maybeSingle();

    const now = Date.now();
    if (existing?.resend_after && new Date(existing.resend_after).getTime() > now) {
      const wait = Math.ceil((new Date(existing.resend_after).getTime() - now) / 1000);
      return NextResponse.json(
        { ok: false, error: "RESEND_TOO_SOON", message: `Try again in ${wait}s` },
        { status: 429 }
      );
    }

    // Generate + store hash
    const code = rand6();
    const codeHash = sha256Hex(code);

    const { error: upErr } = await admin
      .from("phone_otps")
      .upsert(
        {
          e164_phone: phone,
          code_hash: codeHash,
          expires_at: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
          attempts_left: 5,
          resend_after: new Date(now + resendSeconds * 1000).toISOString(),
        },
        { onConflict: "e164_phone" }
      );
    if (upErr) {
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", message: upErr.message },
        { status: 500 }
      );
    }

    // Send via Aakash
    const text = `Your Gatishil code is ${code}. It expires in ${ttlMinutes} minutes.`;
    const sent = await sendAakashSMS(phone, text);
    if (!sent.ok) {
      // Roll back resend_after so user can retry sooner if provider failed
      await admin
        .from("phone_otps")
        .update({ resend_after: new Date(now).toISOString() })
        .eq("e164_phone", phone);

      return NextResponse.json(
        {
          ok: false,
          error: "SMS_SEND_FAILED",
          message: "Aakash send failed",
          provider: { status: sent.status, body: sent.body || sent.text },
        },
        { status: 502 }
      );
    }

    // In non-production debugging, you may want to see the code.
    const debugPayload = (AAKASH_DEBUG_RETURN_CODE && process.env.NODE_ENV !== "production")
      ? { debug_code: code }
      : {};

    return NextResponse.json(
      { ok: true, mode: "phone_otp_sent", resend_after_seconds: resendSeconds, ...debugPayload },
      { status: 200 }
    );
  }

  // ── EMAIL: keep Supabase OTP EXACTLY as before ────────────────────────────────
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

  return NextResponse.json(
    { ok: false, error: "BAD_REQUEST", message: "Provide { phone } or { email }." },
    { status: 400 }
  );
}
