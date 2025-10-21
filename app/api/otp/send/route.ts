import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ───────── env ─────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

// Aakash (fill these)
const AAKASH_BASE_URL = process.env.AAKASH_SMS_BASE_URL!; // e.g., https://api.aakash-sms.nep/... (your real endpoint)
const AAKASH_API_KEY = process.env.AAKASH_SMS_API_KEY!;   // your real key
const AAKASH_SENDER_ID = process.env.AAKASH_SMS_SENDER_ID || ""; // if required

// Optional: expose code in non-prod to speed testing
const AAKASH_DEBUG_RETURN_CODE = process.env.AAKASH_DEBUG_RETURN_CODE === "true" && process.env.NODE_ENV !== "production";

// ───────── clients ─────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

// ───────── utils ─────────
const NEPAL_E164 = /^\+977\d{9,10}$/;
const ttlMinutes = 5;
const resendSeconds = 30;

function rand6() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function sha256Hex(s: string) { return crypto.createHash("sha256").update(s).digest("hex"); }

// Try JSON first; if non-2xx, try form-encoded (common with local gateways).
async function sendAakashSMS(toE164: string, message: string): Promise<{ ok: boolean; mode?: "json"|"form"; status?: number; body?: any; text?: string; }> {
  if (!AAKASH_BASE_URL || !AAKASH_API_KEY) return { ok: false, body: { error: "Missing AAKASH env" } };

  // 1) JSON attempt
  try {
    const r1 = await fetch(AAKASH_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // If your provider expects "X-API-Key" instead, change this:
        "Authorization": `Bearer ${AAKASH_API_KEY}`,
      },
      body: JSON.stringify({
        to: [toE164],               // some APIs want a single string; change if needed
        message,
        senderId: AAKASH_SENDER_ID || undefined,
      }),
    });
    const t1 = await r1.text();
    let j1: any = null; try { j1 = JSON.parse(t1); } catch {}
    if (r1.ok) return { ok: true, mode: "json", status: r1.status, body: j1 ?? t1, text: t1 };
  } catch (e: any) {
    // fall through to form attempt
  }

  // 2) FORM attempt (common)
  try {
    const params = new URLSearchParams();
    // These field names are common; change to match your provider’s spec exactly:
    // e.g. "token", "apikey", "from", "sender", "to", "message", "unicode", etc.
    params.set("to", toE164);
    params.set("message", message);
    if (AAKASH_SENDER_ID) params.set("senderId", AAKASH_SENDER_ID);
    // If the provider expects key inside the form:
    // params.set("apikey", AAKASH_API_KEY);

    const r2 = await fetch(AAKASH_BASE_URL, {
      method: "POST",
      // If your provider wants key in header, keep it; if not, remove it and rely on form field above.
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Bearer ${AAKASH_API_KEY}` },
      body: params.toString(),
    });
    const t2 = await r2.text();
    let j2: any = null; try { j2 = JSON.parse(t2); } catch {}
    if (r2.ok) return { ok: true, mode: "form", status: r2.status, body: j2 ?? t2, text: t2 };
    return { ok: false, mode: "form", status: r2.status, body: j2 ?? t2, text: t2 };
  } catch (e: any) {
    return { ok: false, body: { error: e?.message || "fetch_failed" } };
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone, email, redirectTo } = body || {};

  // ───────── PHONE OTP (Aakash; NOT Supabase SMS) ─────────
  if (typeof phone === "string") {
    if (!NEPAL_E164.test(phone)) {
      return NextResponse.json({ ok: false, field: "phone", error: "INVALID_PHONE", message: "Nepal-only: +977XXXXXXXXXX" }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "RESEND_TOO_SOON", message: `Try again in ${wait}s` }, { status: 429 });
    }

    const code = rand6();
    const codeHash = sha256Hex(code);

    const { error: upErr } = await admin
      .from("phone_otps")
      .upsert({
        e164_phone: phone,
        code_hash: codeHash,
        expires_at: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
        attempts_left: 5,
        resend_after: new Date(now + resendSeconds * 1000).toISOString(),
      }, { onConflict: "e164_phone" });
    if (upErr) {
      return NextResponse.json({ ok: false, error: "DB_ERROR", message: upErr.message }, { status: 500 });
    }

    const text = `Your Gatishil code is ${code}. It expires in ${ttlMinutes} minutes.`;
    const sent = await sendAakashSMS(phone, text);
    if (!sent.ok) {
      // Roll back resend_after so user can retry immediately after a provider failure
      await admin.from("phone_otps").update({ resend_after: new Date(now).toISOString() }).eq("e164_phone", phone);

      return NextResponse.json(
        {
          ok: false,
          error: "SMS_SEND_FAILED",
          message: "Aakash rejected the request",
          provider: { mode: sent.mode, status: sent.status, body: sent.body ?? sent.text ?? null },
        },
        { status: 502 }
      );
    }

    const dbg = AAKASH_DEBUG_RETURN_CODE ? { debug_code: code } : {};
    return NextResponse.json({ ok: true, mode: "phone_otp_sent", resend_after_seconds: resendSeconds, ...dbg }, { status: 200 });
  }

  // ───────── EMAIL OTP (unchanged; still Supabase) ─────────
  if (typeof email === "string" && email.includes("@")) {
    const sb = supabaseAnon();
    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo.length > 0
        ? redirectTo
        : `${SITE_URL}/onboard?src=join`;

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
