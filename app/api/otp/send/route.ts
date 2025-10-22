import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Supabase env ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.gatishilnepal.org";

// ─── Aakash (v4) endpoint ──────────────────────────────────────────────────────
// POST https://sms.aakashsms.com/sms/v4/send-user
const AAKASH_TOKEN = process.env.AAKASH_SMS_API_KEY as string;

// ─── clients ───────────────────────────────────────────────────────────────────
function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}
function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── helpers ───────────────────────────────────────────────────────────────────
const NEPAL_E164 = /^\+977\d{9,10}$/; // e.g. +97798XXXXXXXX or +97797XXXXXXXX
const ttlMinutes = 5;
const resendSeconds = 30;

const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const rand6 = () => Math.floor(100000 + Math.random() * 900000).toString();

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Convert +97798…/+97797… → 98…/97… for Aakash v4
function toAakashLocal(msisdn: string): string | null {
  if (!NEPAL_E164.test(msisdn)) return null;
  const local = msisdn.replace(/^\+977/, "");
  return /^9[78]\d{8}$/.test(local) ? local : null; // ✅ accept 97 and 98 ranges
}

// Aakash v4 send (JSON) with auth-token header
async function sendAakashSMS(e164: string, message: string) {
  if (!AAKASH_TOKEN) {
    return { ok: false, status: 400, body: { error: "AAKASH_TOKEN_MISSING" } }; // ❌ not 500
  }
  const local = toAakashLocal(e164);
  if (!local) {
    return { ok: false, status: 400, body: { error: "INVALID_NEPAL_NUMBER" } };
  }

  const payload = { to: [local], text: [message] };
  try {
    const res = await fetch("https://sms.aakashsms.com/sms/v4/send-user", {
      method: "POST",
      headers: {
        "auth-token": AAKASH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: 400,
        body: { error: "AAKASH_SEND_FAILED", detail: body },
      };
    }
    return { ok: true, status: 200, body };
  } catch (e: any) {
    return { ok: false, status: 400, body: { error: "AAKASH_NETWORK_ERROR", detail: e?.message } };
  }
}

function j(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

// ─── handler ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const origin =
    req.headers.get("origin") ||
    SITE_URL || // fallback to configured public site URL
    "https://www.gatishilnepal.org";

  const body = await req.json().catch(() => ({} as any));
  const { phone, email, redirectTo } = body || {};

  // PHONE: Custom SoT (generate+hash → store in public.otps → Aakash JSON send)
  if (typeof phone === "string" && phone.trim()) {
    const msisdn = phone.trim();
    if (!NEPAL_E164.test(msisdn)) {
      return j(400, {
        ok: false,
        channel: "phone",
        error: "NEPAL_ONLY",
        message: "Phone OTP is Nepal-only (+97797/98…). Use email if abroad.",
      });
    }

    const admin = supabaseAdmin();

    // Enforce resend window using latest row timestamp
    const { data: recent } = await admin
      .from("otps")
      .select("created_at")
      .eq("phone", msisdn)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (recent?.created_at && now - new Date(recent.created_at).getTime() < resendSeconds * 1000) {
      const wait = Math.ceil(resendSeconds - (now - new Date(recent.created_at).getTime()) / 1000);
      return j(429, { ok: false, channel: "phone", error: "RESEND_TOO_SOON", wait });
    }

    // Generate + store HASH ONLY (satisfy NOT NULL "code" with placeholder if schema requires)
    const code = rand6();
    const code_hash = sha256Hex(code);
    const expires_at = new Date(now + ttlMinutes * 60 * 1000).toISOString();

    const insertPayload: Record<string, any> = {
      phone: msisdn,
      code_hash,
      created_at: new Date(now).toISOString(),
      expires_at,
      attempt_count: 0,
      metadata: {},
      code: "REDACTED",
    };

    const { error: insErr, data: insRow } = await admin
      .from("otps")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (insErr) {
      return j(400, {
        ok: false,
        channel: "phone",
        error: "OTP_STORE_FAILED",
        detail: insErr.message,
      });
    }

    // Send via Aakash
    const sms = await sendAakashSMS(
      msisdn,
      `${code} is your Gatishil Nepal OTP. Valid ${ttlMinutes} min.`
    );

    if (!sms.ok) {
      if (insRow?.id) await admin.from("otps").delete().eq("id", insRow.id); // best-effort cleanup
      return j(400, { ok: false, channel: "phone", ...sms.body });
    }

    return j(200, { ok: true, channel: "phone", message: "OTP sent via SMS.", ttlMinutes });
  }

  // EMAIL: Supabase Email OTP (shouldCreateUser = true)
  if (typeof email === "string" && email.trim()) {
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      return j(400, { ok: false, channel: "email", error: "INVALID_EMAIL" });
    }

    const supabase = supabaseAnon();
    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo.length > 0
        ? redirectTo
        : `${origin}/onboard?src=join`; // ✅ absolute, based on request origin

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, emailRedirectTo },
    });

    if (error) {
      // ✅ Never 500 for expected auth failures
      return j(400, {
        ok: false,
        channel: "email",
        error: "SUPABASE_EMAIL_OTP_ERROR",
        message: error.message,
        hint:
          "If message contains 'Database error saving new user', fix profiles trigger/RLS to use user_id.",
      });
    }

    return j(200, { ok: true, channel: "email", message: "Email OTP sent." });
  }

  return j(400, { ok: false, error: "BAD_REQUEST", message: "Provide { phone } or { email }." });
}
