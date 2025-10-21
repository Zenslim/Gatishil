// app/api/otp/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeNepalMobile } from "@/lib/auth/phone";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type JsonBody = Record<string, unknown>;

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

/** Accept JSON, x-www-form-urlencoded, or multipart/form-data, or plain text querystring. */
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

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return server(
      "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const body = await readBody(req);

  // Heuristics: if any phone-like field exists → sms; else if email → email; else use explicit channel; default email.
  const explicitChannel = (body.channel as Channel | undefined)?.toLowerCase() as Channel | undefined;
  const hasPhone = !!extractPhone(body);
  const hasEmail = !!(body.email && body.email.trim());
  const channel: Channel =
    explicitChannel ??
    (hasPhone ? "sms" : hasEmail ? "email" : "email");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (channel === "email") {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) {
      // Tell the client exactly what we received so you can align the payload quickly.
      return bad("Email is required for email OTP.", {
        receivedKeys: Object.keys(body || {}),
        hint: "Send JSON { channel:'email', email:'you@example.com' } or form fields 'channel=email&email=...'.",
      });
    }

    const redirectTo =
      body.redirectTo ?? `${req.nextUrl.origin}/onboard?src=join`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error)
      return server("Email OTP error.", {
        detail: error.message,
        status: (error as any)?.status ?? (error as any)?.statusCode ?? null,
      });
    return ok({ channel: "email", sent: true });
  }

  if (channel === "sms") {
    const rawPhone = extractPhone(body);
    const phone = rawPhone ? normalizeNepalMobile(rawPhone) : null;
    if (!phone) {
      return bad(
        "Invalid phone for Nepal SMS OTP.",
        {
          received: rawPhone ?? null,
          expect:
            "Use a 10-digit Nepal mobile starting with 96/97/98 (e.g., 9812345678) or prefix with +977.",
          example: "+9779812345678",
          acceptedFields: [
            "phone",
            "phoneNumber",
            "mobile",
            "msisdn",
            "to",
            "identifier",
          ],
        }
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });

    if (error) {
      const status = Number(
        (error as any)?.status ?? (error as any)?.statusCode ?? 500
      );

      if (status === 429) {
        return fail(429, "Too many OTP requests. Please wait a minute.", {
          detail: error.message,
          phone,
          status,
        });
      }

      if (status >= 400 && status < 500) {
        return bad(error.message || "SMS OTP rejected.", {
          detail: error.message,
          phone,
          status,
        });
      }

      // 500 indicates provider/Supabase errors (disabled SMS, bad creds, quota, region, etc.)
      return server("SMS OTP error.", {
        detail: error.message,
        phone,
        status,
      });
    }
    return ok({ channel: "sms", sent: true, phone });
  }

  return bad("Unsupported channel. Use 'email' or 'sms'.", {
    receivedChannel: explicitChannel ?? null,
  });
}

export const dynamic = "force-dynamic";
