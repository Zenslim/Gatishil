import { NextResponse } from "next/server";

/**
 * Supabase Auth → Send SMS Hook (HTTPS)
 * Verifies Authorization bearer token, enforces +977, forwards to Aakash.
 * Env: SUPABASE_SMS_HOOK_SECRET, AAKASH_SMS_URL, AAKASH_API_KEY
 */
type SupabaseSmsHookPayload = {
  type: "sms";
  template: string; // e.g., "sms_otp"
  to: string;       // E.164
  message: string;  // OTP body
  metadata?: Record<string, unknown>;
};

const REQUIRED_PREFIX = "+977";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.SUPABASE_SMS_HOOK_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SupabaseSmsHookPayload;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const to = (body.to || "").trim();
  const message = (body.message || "").trim();
  if (!to || !message) {
    return NextResponse.json({ error: "missing_fields", detail: "to and message required" }, { status: 400 });
  }
  if (!to.startsWith(REQUIRED_PREFIX)) {
    return NextResponse.json({ error: "nepal_only", detail: "Phone OTP is Nepal-only (+977)." }, { status: 422 });
  }

  const url = process.env.AAKASH_SMS_URL;
  const apiKey = process.env.AAKASH_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: "misconfigured_provider" }, { status: 500 });
  }

  try {
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to, message, idempotencyKey }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "provider_failed", detail: text.slice(0, 800) }, { status: 502 });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ status: "sent", id: data?.id ?? null, provider: "aakash" });
  } catch (e: any) {
    return NextResponse.json({ error: "network_error", detail: String(e?.message || e) }, { status: 504 });
  }
}
