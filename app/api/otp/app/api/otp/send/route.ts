import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Channel = "email" | "sms";
type BodyLike = Partial<{
  channel: Channel;
  email: string;
  phone: string;
  phoneNumber: string;
  mobile: string;
  msisdn: string;
  to: string;
  identifier: string;
  redirectTo: string;
}>;

type JsonBody = Record<string, unknown>;

const AAKASH_BASE_URL = "https://sms.aakashsms.com/sms/v3/send";
const OTP_MESSAGE = "Your Gatishil code is {code}. It expires in 5 minutes.";

function ok(data: JsonBody = {}) { return NextResponse.json({ ok: true, ...data }, { status: 200 }); }
function bad(message: string, extra: JsonBody = {}) { return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 }); }
function server(message: string, extra: JsonBody = {}) { return NextResponse.json({ ok: false, error: message, ...extra }, { status: 500 }); }

async function readBody(req: NextRequest): Promise<BodyLike> {
  try {
    try { const j = await req.json(); if (j && typeof j === "object") return j as BodyLike; } catch {}
    try {
      const text = await req.text();
      if (text) {
        try { const maybe = JSON.parse(text); if (maybe && typeof maybe === "object") return maybe as BodyLike; }
        catch { const p = new URLSearchParams(text); if ([...p.keys()].length) return Object.fromEntries(p.entries()) as BodyLike; }
      }
    } catch {}
    const qp = req.nextUrl.searchParams; if (qp && [...qp.keys()].length) return Object.fromEntries(qp.entries()) as BodyLike;
    return {};
  } catch { return {}; }
}

function extractPhone(b: BodyLike): string | null {
  const c: any = b.phone ?? b.phoneNumber ?? b.mobile ?? b.msisdn ?? b.to ?? b.identifier ?? "";
  if (typeof c === "number") return String(c);
  if (typeof c === "string") return c;
  return c ? String(c) : null;
}

/** Canonical Nepal E.164 (+97798xxxxxxxx). Returns null if invalid. */
function toNepalE164(anyInput: string | null): string | null {
  if (!anyInput) return null;
  const digits = anyInput.replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(digits)) return `+977${digits}`;         // 98xxxxxxxx
  if (/^9779(6|7|8)\d{8}$/.test(digits)) return `+${digits}`;         // 97798xxxxxxxx
  if (/^\+9779(6|7|8)\d{8}$/.test(anyInput)) return anyInput;         // already +97798xxxxxxxx
  return null;
}

/** Aakash needs 10-digit "to" param */
function toAakashToParam(e164: string): string {
  return e164.replace(/\D/g, "").slice(3); // drop 977
}

async function sendAakashSms_v3(params: { authToken: string; to10Digit: string; text: string; baseUrl?: string; }) {
  const { authToken, to10Digit, text, baseUrl } = params;
  const form = new URLSearchParams({ auth_token: authToken, to: to10Digit, text });
  const res = await fetch(baseUrl || AAKASH_BASE_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  const raw = await res.text();
  let json: any = {}; try { json = JSON.parse(raw); } catch { json = { raw }; }
  if (!res.ok || typeof json !== "object" || json.error === true) throw new Error(`Aakash send failed (${res.status}): ${raw}`);
  return json;
}

function sha256Hex(s: string) { return crypto.createHash("sha256").update(s, "utf8").digest("hex"); }

export async function POST(req: NextRequest) {
  const {
    NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
    AAKASH_SMS_API_KEY,
    AAKASH_SMS_BASE_URL,
    OTP_PEPPER,
  } = process.env;

  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || "";
  const serviceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";
  if (!supabaseUrl || !anonKey) return server("Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or anon key.");

  const body = await readBody(req);
  const explicit = (body.channel as Channel | undefined)?.toLowerCase() as Channel | undefined;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const e164 = toNepalE164(extractPhone(body));
  const hasEmail = email.length > 3;
  const hasPhone = !!e164;
  if (!hasEmail && !hasPhone) return bad("Either email or phone is required", { receivedKeys: Object.keys(body || {}) });

  let channel: Channel;
  if (explicit === "sms") channel = "sms";
  else if (explicit === "email") channel = hasEmail ? "email" : "sms";
  else channel = hasPhone ? "sms" : "email";

  const siteUrl = (NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "").replace(/\/$/, "");

  // Email path (Supabase)
  if (channel === "email") {
    const supabasePublic = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const redirectTo = body.redirectTo || `${siteUrl}/onboard?src=join`;
    const { error } = await supabasePublic.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: redirectTo } });
    if (error) {
      const status = Number((error as any)?.status ?? (error as any)?.statusCode);
      if (status && status >= 500) return server("Email OTP error.", { detail: error.message, status });
      return bad(error.message || "Email OTP error.", { detail: error.message, status: status || null });
    }
    return ok({ channel: "email", sent: true });
  }

  // SMS path (Aakash)
  if (!hasPhone) return bad("Nepal SMS only. Enter 10‑digit 98xxxxxxxx or +97798xxxxxxxx.");
  if (!AAKASH_SMS_API_KEY) return server("SMS gateway not configured (AAKASH_SMS_API_KEY).");

  const to10 = toAakashToParam(e164);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pepper = OTP_PEPPER || "";
  const code_hash = sha256Hex(code + pepper);

  // Send first
  try {
    await sendAakashSms_v3({ authToken: AAKASH_SMS_API_KEY, to10Digit: to10, text: OTP_MESSAGE.replace("{code}", code), baseUrl: AAKASH_SMS_BASE_URL || undefined });
  } catch (e: any) { return server("SMS OTP error.", { detail: e?.message || String(e) }); }

  // Persist (best-effort)
  let persisted = false, detail: string | null = null;
  if (serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const payload = { phone: e164, code_hash, code, attempt_count: 0, metadata: {} };
      const { error: insErr } = await admin.from("otps").insert(payload);
      if (insErr) detail = insErr.message; else persisted = true;
    } catch (err: any) { detail = err?.message || String(err); }
  } else { detail = "Missing SUPABASE_SERVICE_ROLE_KEY"; }

  return ok({ channel: "sms", sent: true, persist: persisted, ...(persisted ? {} : { detail }) });
}
