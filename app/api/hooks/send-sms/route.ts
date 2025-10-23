import { NextRequest, NextResponse } from 'next/server';

const HOOK_TOKEN = process.env.SUPABASE_SMS_HOOK_TOKEN; // you set the same value in Supabase Hook
const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY;

function unauthorized(msg = 'Unauthorized') {
  return NextResponse.json({ ok: false, error: msg }, { status: 401 });
}
function bad(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // --- 1) Verify Authorization header (Bearer <token>) ---
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!HOOK_TOKEN) return unauthorized('Server missing SUPABASE_SMS_HOOK_TOKEN');
  if (token !== HOOK_TOKEN) return unauthorized('Invalid token');

  // --- 2) Validate payload from Supabase ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body');
  }
  const { type, recipient, message } = body || {};
  if (type !== 'sms') return bad('Not an SMS hook event');
  if (!recipient || !message) return bad('Missing recipient or message');

  // Nepal-only guard: +977 and 97/98 numbers
  if (!recipient.startsWith('+977') || !/^\+9779[78]\d{8}$/.test(recipient)) {
    return bad('Recipient must be +977 and start with 97/98');
  }

  // --- 3) Send via Aakash ---
  if (!AAKASH_KEY) {
    return NextResponse.json({ ok: false, error: 'AAKASH_SMS_API_KEY missing' }, { status: 500 });
  }

  // Aakash expects local format (no +977)
  const local = recipient.replace('+977', '');

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({
        to: [local], // e.g., 98XXXXXXXX
        text: message, // Supabase-generated OTP text
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Aakash error ${res.status}: ${txt.slice(0, 200)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to reach Aakash' },
      { status: 502 }
    );
  }
}
