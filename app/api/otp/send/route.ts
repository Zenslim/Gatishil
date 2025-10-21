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

/* ---------- small helpers ---------- */
function ok(data: JsonBody = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
function bad(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 });
}
function server(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 500 });
}

/* ---------- robust body reader ---------- */
async function readBody(req: NextRequest): Promise<BodyLike> {
  try {
    // 1) JSON
    try {
      const j = (await req.json()) as unknown;
      if (j && typeof j === "object") return j as BodyLike;
    } catch {
      /* continue */
    }

    // 2) Form-encoded
    try {
      const text = await req.text();
      if (text) {
        try {
          const maybeJson = JSON.parse(text);
          if (maybeJson && typeof maybeJson === "object") return maybeJson as BodyLike;
        } catch {
          const params = new URLSearchParams(text);
          if ([...params.keys()].length > 0) {
            return Object.fromEntries(params.entries()) as BodyLike;
          }
        }
      }
    } catch {
      /* continue */
    }

    // 3) Query string as last resort
    const qp = req.nextUrl.searchParams;
    if (qp && [...qp.keys()].length > 0) {
      return Object.fromEntries(qp.entries()) as BodyLike;
    }

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
  // Accept 96/97/98 + 8 digits (total 10) OR prefixed with 977
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
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Aakash SMS failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
  return data;
}

/* ---------- main handler ---------- */
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
    return server(
      "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or anon key."
    );
  }

  const body = await readBody(req);
  const receivedKeys = Object.keys(body || {});

  const explicitChannel = (body.channel as Channel | undefined)?.toLowerCase() as
    | Channel
    | undefined;

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  const hasEmail = email.length > 3;

  const rawPhone = extractPhone(body);
  const normalizedPhone = normalizeNepalMobileStrict(rawPhone);
  const hasPhone = !!normalizedPhone;

  if (!hasEmail && !hasPhone) {
    return bad("Either email or phone is required", { receivedKeys });
  }

  // Decide channel
  let channel: Channel;
  if (explicitChannel === "sms") channel = "sms";
  else if (explicitChannel === "email") channel = hasEmail ? "email" : "sms";
  else channel = hasPhone ? "sms" : "email";

  const siteUrl = (NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "").replace(/\/$/, "");
  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (channel === "email") {
    if (!hasEmail) {
      // IMPORTANT: never emit the old phrasing; keep this unified
      return bad("Either email or phone is required", { receivedKeys });
    }

    const redirectTo = body.redirectTo || `${siteUrl}/onboard?src=join`;

    const { error } = await supabasePublic.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      const status = Number((error as any)?.status ?? (error as any)?.statusCode);
      if (status && status >= 500) {
        return server("Email OTP error.", { detail: error.message, status });
      }
      return bad(error.message || "Email OTP error.", {
        detail: error.message,
        status: status || null,
      });
    }

    return ok({ channel: "email", sent: true });
  }

  // channel === 'sms'
  if (!hasPhone) {
    return bad("Nepal SMS only. Use a number starting with 96/97/98…", {
      received: rawPhone ?? null,
      receivedKeys,
      example: "+9779812345678",
    });
  }

  if (!supabaseServiceKey) {
    return server("Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY for SMS OTP.");
  }
  if (!AAKASH_SMS_API_KEY || !AAKASH_SENDER_ID) {
    return server("SMS gateway not configured (AAKASH_SMS_API_KEY/AAKASH_SENDER_ID).");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Example: throttle by last OTP (60s). Keep your existing schema/table.
  const { data: recent } = await supabaseAdmin
    .from("otps")
    .select("id, created_at")
    .eq("phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent?.length) {
    const last = new Date(recent[0].created_at).getTime();
    if (Date.now() - last < 60_000) {
      return bad("Please wait 60 seconds before requesting another code.", {
        channel: "sms",
      });
    }
  }

  // Your existing OTP generation/storage (pseudo – replace with your implementation):
  // const code = await createOtpForPhone(normalizedPhone); // 6-digit string
  const code = String(Math.floor(100000 + Math.random() * 900000)); // fallback demo

  try {
    await sendAakashSms(normalizedPhone, code, {
      apiKey: AAKASH_SMS_API_KEY,
      senderId: AAKASH_SENDER_ID,
      baseUrl: AAKASH_SMS_BASE_URL || undefined,
    });

    // Persist OTP record (pseudo – align with your schema):
    await supabaseAdmin.from("otps").insert({
      phone: normalizedPhone,
      code,
    });

    return ok({ channel: "sms", sent: true });
  } catch (e: any) {
    return server("SMS OTP error.", { detail: e?.message || String(e) });
  }
}
