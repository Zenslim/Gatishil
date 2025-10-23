// Ensure Node runtime so we can read process.env
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const HOOK_TOKEN = process.env.SUPABASE_SMS_HOOK_TOKEN;   // must match Supabase Hook header
const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY;        // your Aakash API key (Bearer)

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  // 1) Guard: we must have our secrets available
  if (!HOOK_TOKEN) return reply(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_TOKEN' });
  if (!AAKASH_KEY) return reply(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 2) Auth: accept `Authorization: Bearer <token>` (what you set in Supabase)
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== HOOK_TOKEN) return reply(401, { ok: false, error: 'Hook requires authorization token' });

  // 3) Parse Supabase Send SMS Hook payload (real schema)
  // Docs: the hook sends { user: { phone: "+977..." }, sms: { otp: "123456", ... } }
  // Ref: Supabase "Send SMS Hook" docs example.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: 'Invalid JSON body' });
  }

  // Primary fields (Supabase schema)
  const phone: string | undefined = body?.user?.phone;
  const otp: string | undefined = body?.sms?.otp;

  // Back-compat if you ever posted custom shape { recipient, message }
  const fallbackRecipient: string | undefined = body?.recipient;
  const fallbackMessage: string | undefined = body?.message;

  // Prefer Supabase fields; fall back to legacy shape
  const recipient = (phone || fallbackRecipient || '').toString();
  const message =
    (fallbackMessage && String(fallbackMessage)) ||
    (otp ? `Your Gatishil Nepal code is ${otp}` : '');

  if (!recipient) return reply(400, { ok: false, error: 'Missing recipient (user.phone)' });
  if (!message) return reply(400, { ok: false, error: 'Missing message (sms.otp)' });

  // 4) Nepal-only guard: +977 and 97/98 mobile prefixes
  if (!/^\+9779[78]\d{8}$/.test(recipient)) {
    return reply(400, { ok: false, error: 'Recipient must be +977 and start with 97/98' });
  }

  // 5) Send via Aakash v3
  // Aakash expects local number (no +977)
  const local = recipient.replace('+977', '');

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({
        to: [local],        // e.g. "98XXXXXXXX"
        text: message,      // "Your Gatishil Nepal code is 123456"
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return reply(502, { ok: false, error: `Aakash error ${res.status}: ${txt.slice(0, 200)}` });
    }

    return reply(200, { ok: true });
  } catch (e: any) {
    return reply(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
