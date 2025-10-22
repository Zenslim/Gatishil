import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const AAKASH_SMS_API_KEY = process.env.AAKASH_SMS_API_KEY as string;

const admin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NEPAL_E164 = /^\+9779[78]\d{8}$/;
const ttlMinutes = 5;
const resendSeconds = 30;

const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const rand6 = () => Math.floor(100000 + Math.random() * 900000).toString();
const j = (status: number, body: unknown) => NextResponse.json(body, { status });

function toAakashLocal(msisdn: string): string | null {
  if (!NEPAL_E164.test(msisdn)) return null;
  const local = msisdn.replace(/^\+977/, "");
  return /^9[78]\d{8}$/.test(local) ? local : null;
}

async function sendAakashSMS(e164: string, text: string) {
  if (!AAKASH_SMS_API_KEY) return { ok: false, status: 400, body: { error: "AAKASH_TOKEN_MISSING" } };
  const local = toAakashLocal(e164);
  if (!local) return { ok: false, status: 400, body: { error: "INVALID_NEPAL_NUMBER" } };

  try {
    const res = await fetch("https://sms.aakashsms.com/sms/v4/send-user", {
      method: "POST",
      headers: { "auth-token": AAKASH_SMS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ to: [local], text: [text] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: 400, body: { error: "AAKASH_SEND_FAILED", detail: body } };
    return { ok: true, status: 200, body };
  } catch (e: any) {
    return { ok: false, status: 400, body: { error: "AAKASH_NETWORK_ERROR", detail: e?.message } };
  }
}

type Payload = { phone?: string };

export async function POST(req: NextRequest) {
  let body: Payload = {};
  try { body = (await req.json()) as Payload; } catch { return j(400, { ok: false, error: "BAD_JSON" }); }

  const phone = (body.phone || "").trim();
  if (!phone) return j(400, { ok: false, error: "PHONE_REQUIRED" });
  if (!NEPAL_E164.test(phone)) return j(400, { ok: false, error: "NEPAL_ONLY", message: "Phone OTP is Nepal-only (+97797/98…). Use email if abroad." });

  const supa = admin();
  const { data: recent } = await supa.from("otps").select("created_at").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();

  const now = Date.now();
  if (recent?.created_at && now - new Date(recent.created_at).getTime() < resendSeconds * 1000) {
    const wait = Math.ceil(resendSeconds - (now - new Date(recent.created_at).getTime()) / 1000);
    return j(429, { ok: false, error: "RESEND_TOO_SOON", wait });
  }

  const code = rand6();
  const code_hash = sha256Hex(code);
  const expires_at = new Date(now + ttlMinutes * 60 * 1000).toISOString();

  const { error: insErr, data: row } = await supa.from("otps").insert({ phone, code_hash, code: "REDACTED", expires_at }).select("id").maybeSingle();
  if (insErr) return j(400, { ok: false, error: "OTP_STORE_FAILED", detail: insErr.message });

  const sms = await sendAakashSMS(phone, `${code} is your Gatishil Nepal OTP. Valid ${ttlMinutes} min.`);
  if (!sms.ok) { if (row?.id) await supa.from("otps").delete().eq("id", row.id); return j(400, { ok: false, ...sms.body }); }

  return j(200, { ok: true, message: "OTP sent via SMS.", ttlMinutes });
}
