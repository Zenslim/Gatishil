// Force Node runtime so we can read env vars
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const HOOK_TOKEN = process.env.SUPABASE_SMS_HOOK_TOKEN;  // must match Supabase Hook header
const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY;       // Aakash Bearer token
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

// Unified JSON responder with optional debug
function J(status: number, body: Record<string, unknown>) {
  if (!DEBUG) return NextResponse.json(body, { status });
  return NextResponse.json({ ...body, _debug: { status } }, { status });
}

// Try to pull phone and message/otp from several possible shapes
function extractPayload(b: any): { recipient?: string; message?: string; reason?: string } {
  if (!b || typeof b !== 'object') return { reason: 'body not object' };

  // Known Supabase Send SMS Hook shapes observed in the wild:
  // 1) { user: { phone: "+97798..." }, sms: { otp: "123456" } }
  // 2) { user: { phone: "+97798..." }, otp: "123456" }
  // 3) { recipient: "+97798...", message: "..." }      (custom legacy)
  // 4) { to: "+97798...", content: "..." }             (alt generic)
  // 5) { phone: "+97798...", otp: "123456" }
  // 6) { destinations: [{ to: "98......" }], text: "..." } (SMS gateways)

  const phone =
    b?.user?.phone ??
    b?.recipient ??
    b?.to ??
    b?.phone ??
    (Array.isArray(b?.destinations) && b.destinations[0]?.to) ??
    undefined;

  const otp =
    b?.sms?.otp ??
    b?.otp ??
    undefined;

  const msg =
    b?.message ??
    b?.content ??
    b?.text ??
    (otp ? `Your Gatishil Nepal code is ${otp}` : undefined);

  const recipient = typeof phone === 'string' ? phone : undefined;
  const message = typeof msg === 'string' ? msg : undefined;

  return { recipient, message, reason: !recipient || !message ? 'missing recipient/message' : 'ok' };
}

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  // local 98/97 format
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  // already E.164 but wrong country
  if (/^\+/.test(s)) return null;
  return null;
}

export async function POST(req: NextRequest) {
  // 0) Env guard
  if (!HOOK_TOKEN) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_TOKEN' });
  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 1) Auth header (Authorization: Bearer <token>)
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== HOOK_TOKEN) return J(401, { ok: false, error: 'Hook requires authorization token' });

  // 2) Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return J(400, { ok: false, error: 'Invalid JSON body' });
  }

  // 3) Extract fields robustly
  const { recipient: rawRecipient, message, reason } = extractPayload(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: `Missing phone or message (${reason})`, shape_hint: body && typeof body === 'object' ? Object.keys(body) : typeof body });
  }

  // 4) Normalize to +977 if needed
  const e164 =
    (rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient)) || null;

  if (!e164) {
    return J(400, { ok: false, error: 'Recipient not Nepal +977 97/98', recipient: rawRecipient });
  }
  if (!/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must start with +97797/98 and be 10 digits local', recipient: e164 });
  }

  // 5) Send to Aakash (expects local 98xxxxxxxx)
  const local = e164.replace('+977', '');

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({
        to: [local],
        text: message,
      }),
    });

    const txt = await res.text().catch(() => '');
    if (!res.ok) {
      return J(502, { ok: false, error: `Aakash ${res.status}`, body: txt.slice(0, 300) });
    }

    // Try to parse Aakash JSON for visibility
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}

    return J(200, { ok: true, aakash: parsed || txt.slice(0, 200) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
