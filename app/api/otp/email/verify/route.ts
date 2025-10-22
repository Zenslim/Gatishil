import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/otp/email/verify
 * Body: { email: string, token: string }
 * Legacy facade retained for backwards compatibility.
 * Email OTP verification must be performed in the browser via Supabase client SDK.
 */
const j = (status: number, body: unknown) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { return j(400, { ok: false, error: "BAD_JSON" }); }
  const email = (body?.email || "").trim().toLowerCase();
  const token = (body?.token || "").trim();
  if (!email || !token) return j(400, { ok: false, error: "EMAIL_AND_TOKEN_REQUIRED" });
  return j(410, {
    ok: false,
    error: "EMAIL_ROUTE_CLIENT_ONLY",
    message: "Email OTP must be verified via the Supabase browser client.",
  });
}
