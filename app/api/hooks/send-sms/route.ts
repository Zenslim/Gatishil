// Force Node runtime so we can read env vars on Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Accept BOTH env names: TOKEN (old) or SECRET (yours)
const HOOK_TOKEN =
  process.env.SUPABASE_SMS_HOOK_TOKEN || process.env.SUPABASE_SMS_HOOK_SECRET;

const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY; // Bearer token from Aakash
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(DEBUG ? { ...body, _debug: { status } } : body, { status });
}

// Extract phone + message from various possible hook shapes
function extractPayload(b: any): { recipient?: string; message?: string; reason?: string } {
  if (!b || typeof b !== 'object') return { reason: 'body not object' };

  // Common Supabase / custom shapes
  const phone =
    b?.user?.phone ??
    b?.recipient ??
    b?.to ??
    b?.phone ??
    (Array.isArray(b?.destinations) && b.destinations[0]?.to) ??
    undefined;

  const otp = b?.sms?.otp ?? b?.otp ?? undefined;

  const msg =
    b?.message ??
    b?.content ??
    b?.text ??
    (otp ? `Your Gatishil Nepal code is ${otp}` : undefined);

  const recipient = typeof phone === 'string' ? phone : undefined;
  const message = typeof msg === 'string' ? msg : undefined;

  return { recipient, message, reason: !recipient || !message ? 'missing recipient/message' : 'ok' };
}

// Normalize local 98/97 → +97798/97
function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  if (/^\+/.test(s)) return null;
  return null;
}

export async function POST(req: NextRequest) {
  // 0) Env guard
  if (!HOOK_TOKEN) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_TOKEN/SUPABASE_SMS_HOOK_SECRET' });
  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 1) Auth header: support Authorization: Bearer <token> OR X-Auth-Token
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const alt = (req.headers.get('x-auth-token') || '').trim();
  const token = bearer || alt;
  if (token !== HOOK_TOKEN) return J(401, { ok: false, error: 'Hook requires authorization token' });

  // 2) Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return J(400, { ok: false, error: 'Invalid JSON body' });
  }

  // 3) Extract + validate payload
  const { recipient: rawRecipient, message, reason } = extractPayload(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: `Missing phone or message (${reason})`, shape_hint: body && typeof body === 'object' ? Object.keys(body) : typeof body });
  }

  // 4) Ensure Nepal +977 97/98
  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164) return J(400, { ok: false, error: 'Recipient not Nepal +977 97/98', recipient: rawRecipient });
  if (!/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +97797/98 followed by 8 digits', recipient: e164 });
  }

  // 5) Send to Aakash (expects local 98/97 without +977)
  const local = e164.replace('+977', '');

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({ to: [local], text: message }),
    });

    const txt = await res.text().catch(() => '');
    if (!res.ok) return J(502, { ok: false, error: `Aakash ${res.status}`, body: txt.slice(0, 300) });

    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    return J(200, { ok: true, aakash: parsed || txt.slice(0, 200) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
