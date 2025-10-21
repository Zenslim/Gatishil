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
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function ok(data: JsonBody = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
function bad(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 });
}
function server(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 500 });
}

async function readBody(req: NextRequest): Promise<BodyLike> {
  try {
    try {
      const j = (await req.json()) as unknown;
      if (j && typeof j === "object") return j as BodyLike;
    } catch {}
    try {
      const text = await req.text();
      if (text) {
        try {
          const maybeJson = JSON.parse(text);
          if (maybeJson && typeof maybeJson === "object") return maybeJson as BodyLike;
        } catch {
          const params = new URLSearchParams(text);
          if ([...params.keys()].length > 0) return Object.fromEntries(params.entries()) as BodyLike;
        }
      }
    } catch {}
    const qp = req.nextUrl.searchParams;
    if (qp && [...qp.keys()].length > 0) return Object.fromEntries(qp.entries()) as BodyLike;
    return {};
  } catch {
    return {};
  }
}

function extractPhone(body: BodyLike): string | null {
  const candidate =
    (body.phone as any) ??
    (body.phoneNumber as any) ??
    (body.mobile as any) ??
    (body.msisdn as any) ??
    (body.to as any) ??
    (body.identifier as any) ??
    "";
  if (typeof candidate === "number") return String(candidate);
  if (typeof candidate === "string") return candidate;
  return candidate ? String(candidate) : null;
}

/** +9779x… if Nepal mobile (96/97/98 + 8 digits) or already 977-prefixed */
function normalizeNepalMobileStrict(rawInput: string | null): string | null {
  if (!rawInput) return null;
  const raw = rawInput.replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(raw)) return `+977${raw}`;
  if (/^9779(6|7|8)\d{8}$/.test(raw)) return `+${raw}`;
  return null;
}

/** Aakash wants 10-digit 96/97/98… */
function toAakashToParam(normalizedPlus977: string): string {
  const digits = normalizedPlus977.replace(/\D/g, "");
  if (/^9779(6|7|8)\d{8}$/.test(digits)) return digits.slice(3);
  if (/^9(6|7|8)\d{8}$/.test(digits)) return digits;
  return "";
}

async function sendAakashSms_v3(params: {
  authToken: string;
  to10Digit: string;
  text: string;
  baseUrl?: string;
}) {
  const { authToken, to10Digit, text, baseUrl } = params;
  const form = new URLSearchParams({ auth_token: authToken, to: to10Digit, text });
  const res = await fetch(baseUrl || AAKASH_BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const raw = await res.text();
  let json: any = {};
  try { json = JSON.parse(raw); } catch { json = { raw }; }
  if (!res.ok || typeof json !== "object" || json.error === true) {
    throw new Error(`Aakash send failed (${res.status}): ${raw}`);
  }
  return json; // { error:false, ... }
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

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
    OTP_PEPPER, // optional extra hardening for code_hash
  } = process.env;

  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || "";
  const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return server("Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or anon key.");
  }

  const body = await readBody(req);
  const receivedKeys = Object.keys(body || {});
  const explicitChannel = (body.channel as Channel | undefined)?.toLowerCase() as Channel | undefined;

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  const hasEmail = email.length > 3;

  const rawPhone = extractPhone(body);
  const normalizedPhone = normalizeNepalMobileStrict(rawPhone);
  const hasPhone = !!normalizedPhone;

  if (!hasEmail && !hasPhone) {
    return bad("Either email or phone is required", { receivedKeys });
  }

  // Decide channel with graceful fallback
  let channel: Channel;
  if (explicitChannel === "sms") channel = "sms";
  else if (explicitChannel === "email") channel = hasEmail ? "email" : "sms";
  else channel = hasPhone ? "sms" : "email";

  const siteUrl = (NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "").replace(/\/$/, "");

  // EMAIL path
  if (channel === "email") {
    if (!hasEmail) return bad("Either email or phone is required", { receivedKeys });

    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const redirectTo = body.redirectTo || `${siteUrl}/onboard?src=join`;
    const { error } = await supabasePublic.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });

    if (error) {
      const status = Number((error as any)?.status ?? (error as any)?.statusCode);
      if (status && status >= 500) return server("Email OTP error.", { detail: error.message, status });
      return bad(error.message || "Email OTP error.", { detail: error.message, status: status || null });
    }

    return ok({ channel: "email", sent: true });
  }

  // SMS path
  if (!hasPhone) {
    return bad("Nepal SMS only. Use a number starting with 96/97/98…", {
      received: rawPhone ?? null,
      receivedKeys,
      example: "+9779812345678",
    });
  }
  if (!AAKASH_SMS_API_KEY) {
    return server("SMS gateway not configured (AAKASH_SMS_API_KEY).");
  }

  const to10 = toAakashToParam(normalizedPhone);
  if (!to10) {
    return bad("Nepal SMS only. Use a number starting with 96/97/98…", {
      received: rawPhone ?? null,
      example: "9812345678",
    });
  }

  // Generate 6-digit OTP and its hash
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pepper = OTP_PEPPER || "";
  const code_hash = sha256Hex(code + pepper);
  const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // Send first (so user always gets the SMS)
  let gateway: any;
  try {
    gateway = await sendAakashSms_v3({
      authToken: AAKASH_SMS_API_KEY,
      to10Digit: to10,
      text: OTP_MESSAGE.replace("{code}", code),
      baseUrl: AAKASH_SMS_BASE_URL || undefined,
    });
  } catch (e: any) {
    return server("SMS OTP error.", { detail: e?.message || String(e) });
  }

  // Persist best-effort (use service role if available)
  let persisted = false;
  let persistDetail: string | null = null;
  if (supabaseServiceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const payload: Record<string, any> = {
        phone: normalizedPhone,
        code_hash,
        code,                 // keep raw for now; you can remove later if you only verify via hash
        expires_at,
        attempt_count: 0,
        metadata: {},
      };

      const { error: insErr } = await supabaseAdmin.from("otps").insert(payload);
      if (insErr) {
        persistDetail = insErr.message;
      } else {
        persisted = true;
      }
    } catch (e: any) {
      persistDetail = e?.message || String(e);
    }
  } else {
    persistDetail = "Missing SUPABASE_SERVICE_ROLE_KEY";
  }

  // Never 500 after gateway success
  return ok({
    channel: "sms",
    sent: true,
    persist: persisted,
    ...(persisted ? {} : { detail: persistDetail }),
    gateway,
  });
}
