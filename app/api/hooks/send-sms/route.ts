// Ensure server (not edge) so process.env is available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function j(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: NextRequest) {
  // ---- 0) Pull secrets at request-time (safer across runtimes) ----
  const HOOK_TOKEN = process.env.SUPABASE_SMS_HOOK_TOKEN;
  const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY;

  // ---- 1) Verify server has secrets ----
  if (!HOOK_TOKEN) return j(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_TOKEN' });
  if (!AAKASH_KEY) return j(500, { ok: false, error: 'Server missing AAKASH_SMS_API_KEY' });

  // ---- 2) Verify auth header (Authorization: Bearer <token>) or X-Auth-Token ----
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const alt = (req.headers.get('x-auth-token') || '').trim();
  const token = bearer || alt;
  if (token !== HOOK_TOKEN) return j(401, { ok: false, error: 'Hook requires authorization token' });

  // ---- 3) Parse & normalize payload from Supabase ----
  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return j(400, { ok: false, error: 'Invalid JSON body' });
  }

  // Supabase may send slightly different keys across versions.
  // Prefer 'recipient' & 'message'. Fallbacks: 'phone' or 'to' for number; 'content' or 'text' for message.
  const type = raw?.type ?? 'sms';
  const recipient: string =
    raw?.recipient ??
    raw?.phone ??
    raw?.to ??
    raw?.phone_number ??
    '';
  const message: string =
    raw?.message ??
    raw?.content ??
    raw?.text ??
    '';

  if (type !== 'sms') return j(400, { ok: false, error: 'Not an SMS event', gotType: type });
  if (!recipient || !message) {
    return j(400, {
      ok: false,
      error: 'Missing recipient or message',
      got: { recipient
