// app/api/otp/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Channel = "email" | "sms";
type BodyShape = Partial<{
  channel: Channel;
  email: string;
  phone: string;
  redirectTo: string;
}>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data, { status: 200 });
}
function bad(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}
function server(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 500 });
}

// Accept JSON, URL-encoded form, or raw text "key=value&..."
async function readBody(req: NextRequest): Promise<BodyShape> {
  const ctype = req.headers.get("content-type")?.toLowerCase() ?? "";
  try {
    if (ctype.includes("application/json")) {
      return (await req.json()) as BodyShape;
    }
    if (ctype.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return {
        channel: (params.get("channel") as Channel) ?? undefined,
        email: params.get("email") ?? undefined,
        phone: params.get("phone") ?? undefined,
        redirectTo: params.get("redirectTo") ?? undefined,
      };
    }
    // Fallback: try JSON first, then parse as querystring-ish text
    try {
      const maybe = (await req.json()) as BodyShape;
      return maybe;
    } catch {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const obj: BodyShape = {};
      for (const [k, v] of params) (obj as any)[k] = v;
      return obj;
    }
  } catch {
    return {};
  }
}

// Normalize Nepal mobile: allow 98/97/96 + 8 digits, or already +977...
function normalizeNepalPhone(input?: string | null) {
  if (!input) return null;
  const s = input.replace(/\s|-/g, "").trim();
  if (s.startsWith("+977")) return s;
  if (/^9\d{9}$/.test(s)) return `+977${s}`;
  return null;
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return server(
      "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const body = await readBody(req);
  const channel: Channel = (body.channel as Channel) || "email";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (channel === "email") {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) return bad("Email is required for email OTP.", { field: "email" });

    const redirectTo =
      body.redirectTo ?? `${req.nextUrl.origin}/onboard?src=join`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) return server("Email OTP error.", { detail: error.message });
    return ok({ channel: "email", sent: true });
  }

  if (channel === "sms") {
    const phone = normalizeNepalPhone(body.phone);
    if (!phone) {
      return bad(
        "Invalid phone for Nepal SMS OTP. Use 98XXXXXXXXXX/97XXXXXXXXXX/96XXXXXXXXXX or +9779XXXXXXXXX.",
        { example: "+97798XXXXXXXX" }
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });

    if (error) {
      // Supabase will return provider-related causes (disabled SMS, bad creds, quota, etc.)
      return server("SMS OTP error.", { detail: error.message, phone });
    }
    return ok({ channel: "sms", sent: true, phone });
  }

  return bad("Unsupported channel. Use 'email' or 'sms'.", { channel });
}

export const dynamic = "force-dynamic";
