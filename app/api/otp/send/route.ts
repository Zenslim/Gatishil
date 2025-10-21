// app/api/otp/send/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Supabase env ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

// ─── Aakash (v4) env ───────────────────────────────────────────────────────────
// POST https://sms.aakashsms.com/sms/v4/send-user
// Header:  auth-token: <YOUR_TOKEN>
// Body:    { "to": ["98XXXXXXXX"], "text": ["Hello world"] }
const AAKASH_URL =
  process.env.AAKASH_SMS_BASE_URL || "https://sms.aakashsms.com/sms/v4/send-user";
const AAKASH_AUTH_TOKEN = process.env.AAKASH_SMS_AUTH_TOKEN as string; // set in Vercel
const AAKASH_DEBUG_RETURN_CODE =
  process.env.AAKASH_DEBUG_RETURN_CODE === "true" && process.env.NODE_ENV !== "production";

// ─── clients ───────────────────────────────────────────────────────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}

// ─── helpers ───────────────────────────────────────────────────────────────────
const NEPAL_E164 = /^\+977\d{9,10}$/; // e.g. +97798XXXXXXXX
const ttlMinutes = 5;
const resendSeconds = 30;

const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const rand6 = () => Math.floor(100000 + Math.random() * 900000).toString();

// Convert +97798XXXXXXXX → 98XXXXXXXX for Aakash v4
function toAakashLocal(msisdn: string): string | null {
  if (!NEPAL_E164.test(msisdn)) return null;
  const local = msisdn.replace(/^\+977/, "");
  // Aakash expects local 98xxxxxxxx (10 digits)
  if (!/^98\d{8}$/.test(local)) return null;
  return local;
}

// Aakash v4 send (JSON) with auth-token header
async function sendAakashSMS(e164: string, message: string) {
  if (!AAKASH_AUTH_TOKEN) {
    return { ok: false, status: 500, body: { error: "Missing AAKASH_SMS_AUTH_TOKEN" } };
  }
  const local = toAakashLocal(e164);
  if (!local) {
    return { ok: false, status: 400, body: { error: "Invalid Nepal number format for Aakash" } };
  }

  const payload = {
    to: [local],     // array of local numbers without +977
    text: [message], // array of text strings
  };

  try {
    const res = await fetch(AAKASH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "auth-token": AAKASH_AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, status: 502, body: { error: e?.message || "fetch_failed" } };
  }
}

// ─── handler ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { phone, email, redirectTo } = body || {};

  // PHONE: Custom SoT (generate+hash → store in public.otps → Aakash JSON send)
  if (typeof phone === "string") {
    if (!NEPAL_E164.test(phone)) {
      return NextResponse.json(
        { ok: false, field: "phone", error: "INVALID_PHONE", message: "Nepal-only: +97798XXXXXXXX" },
        { status: 400 }
      );
    }

    // Enforce resend window using latest row timestamp
    const { data: recent } = await admin
      .from("otps")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (recent?.created_at && now - new Date(recent.created_at).getTime() < resendSeconds * 1000) {
      const wait = Math.ceil(
        resendSeconds - (now - new Date(recent.created_at).getTime()) / 1000
      );
      return NextResponse.json(
        { ok: false, error: "RESEND_TOO_SOON", message: `Try again in ${wait}s` },
        { status: 429 }
      );
    }

    // Generate + store HASH ONLY
    const code = rand6();
    const codeHash = sha256Hex(code);
    const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("otps").insert({
      phone,
      code_hash: codeHash,
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt,
      attempt_count: 0,
      metadata: {},
    });
    if (insErr) {
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", message: insErr.message },
        { status: 500 }
      );
    }

    // Send via Aakash v4 (JSON + auth-token)
    const msg = `Your Gatishil code is ${code}. It expires in ${ttlMinutes} minutes.`;
    const sent = await sendAakashSMS(phone, msg);
    if (!sent.ok) {
      return NextResponse.json(
        { ok: false, error: "SMS_SEND_FAILED", provider: { status: sent.status, body: sent.body } },
        { status: 502 }
      );
    }

    const dbg = AAKASH_DEBUG_RETURN_CODE ? { debug_code: code } : {};
    return NextResponse.json(
      { ok: true, mode: "phone_otp_sent", resend_after_seconds: resendSeconds, ...dbg },
      { status: 200 }
    );
  }

  // EMAIL: Supabase native (unchanged)
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

  return NextResponse.json(
    { ok: false, error: "BAD_REQUEST", message: "Provide { phone } or { email }." },
    { status: 400 }
  );
}
