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

function ok(data: JsonBody = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

function fail(status: number, message: string, extra?: JsonBody) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function bad(message: string, extra?: JsonBody) {
  return fail(400, message, extra);
}

function server(message: string, extra?: JsonBody) {
  return fail(500, message, extra);
}

/** Accept JSON, x-www-form-urlencoded, multipart/form-data, or plain text querystring. */
async function readBody(req: NextRequest): Promise<BodyLike> {
  const ctype = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ctype.includes("application/json")) {
      return (await req.json()) as BodyLike;
    }
    if (ctype.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return Object.fromEntries(params.entries()) as BodyLike;
    }
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const out: Record<string, string> = {};
      for (const [k, v] of form.entries()) {
        if (typeof v === "string") out[k] = v;
      }
      return out as BodyLike;
    }
    // Fallbacks
    try {
      return (await req.json()) as BodyLike;
    } catch {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return Object.fromEntries(params.entries()) as BodyLike;
    }
  } catch {
    return {};
  }
}

/** Pull the first present phone-like field */
function extractPhone(body: BodyLike): string | null {
  const candidate =
    body.phone ??
    body.phoneNumber ??
    body.mobile ??
    body.msisdn ??
    body.to ??
    body.identifier ??
    "";
  return candidate || null;
}

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
  if (!res.ok || data?.status === "error") {
    const detail = typeof data?.message === "string" ? data.message : undefined;
    const err = new Error(detail || "Aakash SMS failed");
    (err as any).status = res.status;
    throw err;
  }

  return message;
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
    AAKASH_SENDER_ID,
  } = process.env;

  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || "";
  const supabaseServiceKey =
    SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return server(
      "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or anon key."
    );
  }

  const body = await readBody(req);

  const explicitChannel = (body.channel as Channel | undefined)?.toLowerCase() as
    | Channel
    | undefined;
  const { email } = body || {};
  const rawPhone = extractPhone(body);
  const emailValue = typeof email === "string" ? email.trim() : "";
  const hasEmail = emailValue.length > 3;
  const hasPhone = typeof rawPhone === "string" && rawPhone.trim().length >= 9;

  if (!hasEmail && !hasPhone) {
    return bad("Either email or phone is required", {
      receivedKeys: Object.keys(body || {}),
    });
  }

  let normalizedPhone: string | null = null;
  if (hasPhone && rawPhone) {
    const raw = rawPhone.replace(/\D/g, "");
    if (/^98\d{8}$/.test(raw)) normalizedPhone = `+977${raw}`;
    else if (raw.startsWith("977") && /^97798\d{8}$/.test(raw)) normalizedPhone = `+${raw}`;
    else {
      return bad("Nepal SMS only. Use a number starting with 98…", {
        received: rawPhone,
      });
    }
  }

  const channel: Channel = explicitChannel ?? (hasPhone ? "sms" : "email");

  const siteUrl = (NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "").replace(
    /\/$/,
    ""
  );

  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (channel === "email") {
    const email = emailValue.toLowerCase();
    if (!email) {
      return bad("Either email or phone is required", {
        receivedKeys: Object.keys(body || {}),
        hint: "Send JSON { channel:'email', email:'you@example.com' } or form fields 'channel=email&email=...'.",
      });
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

  if (channel === "sms") {
    const normalized = normalizedPhone;
    if (!normalized) {
      return bad("Nepal SMS only. Use a number starting with 98…", {
        received: rawPhone ?? null,
      });
    }

    if (!supabaseServiceKey) {
      return server(
        "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY for SMS OTP."
      );
    }

    if (!AAKASH_SMS_API_KEY) {
      return server("SMS gateway not configured.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Enforce 60-second resend cooldown
    const { data: recent, error: recentError } = await supabaseAdmin
      .from("otps")
      .select("id, created_at")
      .eq("phone", normalized)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentError) {
      return server("Could not check OTP history.", { detail: recentError.message });
    }

    if (recent && recent.length > 0) {
      const latest = recent[0];
      const created = new Date(latest.created_at).getTime();
      if (Date.now() - created < 60_000) {
        return fail(429, "Too many OTP requests. Please wait a minute.", {
          phone: normalized,
        });
      }
    }

    try {
      const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "otp",
        phone: normalized,
        options: {
          channel: "sms",
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      const code = link?.properties?.phone_otp;
      if (!code || typeof code !== "string") {
        throw new Error("Supabase did not issue an OTP code.");
      }

      await sendAakashSms(normalized, code, {
        apiKey: AAKASH_SMS_API_KEY,
        senderId: AAKASH_SENDER_ID || "GATISHIL",
        baseUrl: AAKASH_SMS_BASE_URL,
      });

      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      const { error: insertError } = await supabaseAdmin.from("otps").insert({
        phone: normalized,
        code,
        expires_at: expiresAt,
        status: "sent",
      });

      if (insertError) throw insertError;

      return ok({
        channel: "sms",
        sent: true,
        phone: normalized,
        message: "OTP sent via SMS. It expires in 5 minutes.",
      });
    } catch (error: any) {
      const status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status);
      const detail = typeof error?.message === "string" ? error.message : undefined;

      if (status === 429) {
        return fail(429, "Too many OTP requests. Please wait a minute.", {
          phone: normalized,
          detail,
        });
      }

      if (status && status >= 500) {
        return server("SMS OTP error.", {
          phone: normalized,
          detail,
          status,
        });
      }

      return bad(detail || "Could not send SMS OTP.", {
        phone: normalized,
        status: status || null,
      });
    }
  }

  return bad("Unsupported channel. Use 'email' or 'sms'.", {
    receivedChannel: explicitChannel ?? null,
  });
}
