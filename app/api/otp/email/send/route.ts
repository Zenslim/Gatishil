import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/otp/email/send
 * Body: { email: string, redirectTo?: string }
 * Legacy facade retained for backwards compatibility.
 * Email OTP is now handled entirely in the browser via Supabase client SDK.
 */
const j = (status: number, body: unknown) => NextResponse.json(body, { status });

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { return j(400, { ok: false, error: "BAD_JSON" }); }
  const email = (body?.email || "").trim().toLowerCase();
  if (!email) return j(400, { ok: false, error: "EMAIL_REQUIRED" });
  if (!isValidEmail(email)) return j(400, { ok: false, error: "INVALID_EMAIL" });
  return j(410, {
    ok: false,
    error: "EMAIL_ROUTE_CLIENT_ONLY",
    message: "Email OTP must be requested via the Supabase browser client.",
  });
}
