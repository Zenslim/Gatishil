import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const DEFAULT_AAKASH_SMS_BASE_URL = "https://sms.aakashsms.com/sms/v3/send";
const OTP_MESSAGE = "Your Gatishil code is {code}. It expires in 5 minutes.";

/* ---------- responses ---------- */
function ok(data: JsonBody = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
function bad(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 });
}
function server(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 500 });
}

/* ---------- body parsing ---------- */
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

/* ---------- phone helpers ---------- */
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

function normalizeNepalMobileStrict(rawInput: string | null): string | null {
  if (!rawInput) return null;
  const raw = rawInput.replace(/\D/g, "");
  // allow 96/97/98 + 8 digits (10 total), or prefixed 977
  if (/^9(6|7|8)\d{8}$/.test(raw)) return `+977${raw}`;
  if (/^9779(6|7|8)\d{8}$/.test(raw)) return `+${raw}`;
  return null;
}

/* ---------- Aakash SMS ---------- */
async function sendAakashSms(
  phone: string,
  code: string,
  options: { apiKey: string; senderId: string; baseUrl?: string }
) {
  const { apiKey, senderId, baseUrl } = options;
  const message = OTP_MESSAGE.replace("{code}", code);
  const gatewayPhone = phone.startsWith("+") ? phone.slice(1) : phone;

  const body = new URLSearchParams({
    key: apiKey,
    route: "sms",
    sender: senderId,
    phone: gatewayPhone,
    text: message,
  });

  const res = await fetch(baseUrl || DEFAULT_AAKASH_SMS_BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    // Aakash is public HTTPS; no keepalive or special agent needed
  });

  // Aakash returns JSON; if not, try text
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    // Surface exact status + payload for debugging
    throw new Error(`Aakash ${res.status}: ${text}`);
  }

  // Some gateways return ok=1 / success=true etc. Try to detect failure.
  // If their schema differs, you will still see the raw text in errors above.
  if (typeof json === "object") {
    if ("success" in json && json.success === false) {
      throw new Error(`Aakash error: ${text}`);
    }
    if ("status" in json && String(json.status).toLowerCase() !== "success") {
      // conservative: only treat explicit "success" as success
      // remove if your account returns a different field
    }
  }

  return json;
}

/* ---------- main ---------- */
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
    AAKASH_SENDER_ID,
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

  // Decide channel with fallbacks
  let channel: Channel;
  if (explicitChannel === "sms") channel = "sms";
  else if (explicitChannel === "email") channel = hasEmail ? "email" : "sms";
  else channel = hasPhone ? "sms" : "email";

  const siteUrl = (NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "").replace(/\/$/, "");
  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (channel === "email") {
    if (!hasEmail) return bad("Either email or phone is required", { receivedKeys });

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

  if (!supabaseServiceKey) return server("Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY for SMS OTP.");
  if (!AAKASH_SMS_API_KEY || !AAKASH_SENDER_ID) {
    return server("SMS gateway not configured (AAKASH_SMS_API_KEY/AAKASH_SENDER_ID).");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Throttle (60s)
  const { data: recent } = await supabaseAdmin
    .from("otps")
    .select("id, created_at")
    .eq("phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent?.length) {
    const last = new Date(recent[0].created_at).getTime();
    if (Date.now() - last < 60_000) {
      return bad("Please wait 60 seconds before requesting another code.", { channel: "sms" });
    }
  }

  // Generate code (replace with your secure generator if you have one)
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    const gateway = await sendAakashSms(normalizedPhone, code, {
      apiKey: AAKASH_SMS_API_KEY,
      senderId: AAKASH_SENDER_ID,
      baseUrl: AAKASH_SMS_BASE_URL || undefined,
    });

    // Only after successful gateway send, persist the OTP (align with your schema)
    const { error: insErr } = await supabaseAdmin.from("otps").insert({
      phone: normalizedPhone,
      code,
    });
    if (insErr) {
      return server("Failed to persist OTP.", { detail: insErr.message });
    }

    return ok({ channel: "sms", sent: true, gateway });
  } catch (e: any) {
    // Surface precise gateway error to the client for now
    return server("SMS OTP error.", { detail: e?.message || String(e) });
  }
}
