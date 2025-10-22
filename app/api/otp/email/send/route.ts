import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/otp/email/send
 * Body: { email: string, redirectTo?: string }
 * Thin wrapper around Supabase Email OTP (client-native recommended).
 * Returns 200/400 JSON, never 500 for expected failures.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || (process.env.SUPABASE_ANON_KEY as string);

const j = (status: number, body: unknown) => NextResponse.json(body, { status });

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { return j(400, { ok: false, error: "BAD_JSON" }); }
  const email = (body?.email || "").trim().toLowerCase();
  const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo : "";
  if (!email) return j(400, { ok: false, error: "EMAIL_REQUIRED" });
  if (!isValidEmail(email)) return j(400, { ok: false, error: "INVALID_EMAIL" });

  const origin = req.headers.get("origin") || "https://www.gatishilnepal.org";
  const emailRedirectTo = redirectTo && redirectTo.startsWith("http") ? redirectTo : `${origin}/onboard?src=join`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo }
  });

  if (error) {
    return j(400, {
      ok: false,
      error: "SUPABASE_EMAIL_OTP_ERROR",
      message: error.message,
      debug: { emailRedirectTo }
    });
  }
  return j(200, { ok: true, message: "Email OTP sent." });
}
