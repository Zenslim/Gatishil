// app/api/otp/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  channel?: "email" | "sms";
  email?: string;
  phone?: string;
  redirectTo?: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[/api/otp/send] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data, { status: 200 });
}
function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
function server(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

function normalizeNepalPhone(input: string) {
  const s = input.trim();
  if (s.startsWith("+977")) return s;
  if (/^98\d{8}$/.test(s)) return `+977${s}`;
  return null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body.");
  }

  const channel = body.channel ?? ("email" as const);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (channel === "email") {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) return bad("Email is required for email OTP.");

    const redirectTo =
      body.redirectTo ?? `${req.nextUrl.origin}/onboard?src=join`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) return server(`Email OTP error: ${error.message}`);
    return ok({ channel: "email", sent: true });
  }

  if (channel === "sms") {
    const phoneRaw = body.phone ?? "";
    const phone = normalizeNepalPhone(phoneRaw);
    if (!phone)
      return bad(
        "Phone is required for SMS OTP (Nepal only). Use 98XXXXXXXX or +97798XXXXXXXX."
      );

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });

    if (error) return server(`SMS OTP error: ${error.message}`);
    return ok({ channel: "sms", sent: true, phone });
  }

  return bad("Unsupported channel. Use 'email' or 'sms'.");
}

export const dynamic = "force-dynamic";
