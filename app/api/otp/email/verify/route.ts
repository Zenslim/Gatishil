import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/otp/email/verify
 * Body: { email: string, token: string }
 * Thin wrapper for Supabase verifyOtp (client-native recommended).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || (process.env.SUPABASE_ANON_KEY as string);

const j = (status: number, body: unknown) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { return j(400, { ok: false, error: "BAD_JSON" }); }
  const email = (body?.email || "").trim().toLowerCase();
  const token = (body?.token || "").trim();
  if (!email || !token) return j(400, { ok: false, error: "EMAIL_AND_TOKEN_REQUIRED" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) return j(400, { ok: false, error: "SUPABASE_EMAIL_VERIFY_ERROR", message: error.message });
  return j(200, { ok: true, message: "Email verified." });
}
