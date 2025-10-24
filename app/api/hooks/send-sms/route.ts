export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const AAKASH_URL = process.env.AAKASH_SMS_BASE_URL || 'https://sms.aakashsms.com/sms/v4/send-user';
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();
const AAKASH_SENDER_ID = (process.env.AAKASH_SENDER_ID || '').trim(); // optional approved mask

function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function extractPhoneAndMessage(b: any) {
  const phone =
    b?.user?.phone ??
    b?.recipient ??
    b?.to ??
    b?.phone ??
    (Array.isArray(b?.destinations) && b.destinations[0]?.to) ??
    undefined;

  const otp = b?.sms?.otp ?? b?.otp ?? undefined;
  const message =
    b?.message ?? b?.content ?? b?.text ?? (otp ? `Your Gatishil Nepal code is ${otp}` : undefined);

  return {
    phone: typeof phone === 'string' ? phone.trim() : undefined,
    message: typeof message === 'string' ? message : undefined,
  };
}

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}

function toAakashLocal(e164: string): string | null {
  if (!e164.startsWith('+977')) return null;
  const local = e164.slice(4);
  return /^98\d{8}$/.test(local) ? local : null;
}

// Simple GET probe
export async function GET() {
  return J(200, {
    ok: true,
    version: 'restored-aakash-v4-json-nohook',
    expects: 'Aakash v4 JSON + auth-token',
    runtime,
  });
}

// POST: accept Supabase Auth hook body and deliver SMS via Aakash v4
export async function POST(req: NextRequest) {
  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // Accept JSON or raw text JSON
  let body: any;
  try {
    body = await req.json();
  } catch {
    const raw = await req.text();
    try { body = JSON.parse(raw); } catch { return J(400, { ok: false, error: 'Invalid JSON body' }); }
  }

  const { phone: rawPhone, message } = extractPhoneAndMessage(body || {});
  if (!rawPhone || !message) return J(400, { ok: false, error: 'Missing phone or message' });

  const e164 = rawPhone.startsWith('+977') ? rawPhone : toE164Nepal(rawPhone);
  if (!e164 || !/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +977 and start with 97/98', recipient: rawPhone });
  }

  const local10 = toAakashLocal(e164);
  if (!local10) return J(400, { ok: false, error: 'Invalid Nepal number for Aakash v4', recipient: e164 });

  const payload: Record<string, any> = { to: [local10], text: [message] };
  if (AAKASH_SENDER_ID) payload.from = AAKASH_SENDER_ID;

  try {
    const res = await fetch(AAKASH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // CRITICAL: v4 uses "auth-token" (not Authorization: Bearer)
        'auth-token': AAKASH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* v4 can return plain text */ }

    if (!res.ok) {
      return J(502, { ok: false, error: `Aakash v4 ${res.status}`, body: parsed ?? text.slice(0, 800) });
    }

    return J(200, { ok: true, aakash: parsed ?? text.slice(0, 400), delivered: true, number: e164 });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash v4' });
  }
}
