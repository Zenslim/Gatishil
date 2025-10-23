// Force Node.js runtime so server env vars are available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const HOOK_TOKEN = process.env.SUPABASE_SMS_HOOK_TOKEN; // must exist in Vercel
const AAKASH_KEY = process.env.AAKASH_SMS_API_KEY;

function j(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

export async function POST(req: NextRequest) {
  // 1) Verify server has the secret
  if (!HOOK_TOKEN) return j(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_TOKEN' });

  // 2) Accept either:
  //    Authorization: Bearer <token>
  //    or X-Auth-Token: <token>
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const alt = req.headers.get('x-auth-token')?.trim() || '';
  const token = bearer || alt;
  if (token !== HOOK_TOKEN) return j(401, { ok: false, error: 'Hook requires authorization token' });

  // 3) Parse Supabase hook payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return j(400, { ok: false, error: 'Invalid JSON body' });
  }
  const { type, recipient, message } = body || {};
  if (type !== 'sms') return j(400, { ok: false, error: 'Not an SMS event' });
  if (!recipient || !message) return j(400, { ok: false, error: 'Missing recipient or message' });

  // Nepal-only guard: +977 and 97/98
  if (!/^\+9779[78]\d{8}$/.test(String(recipient))) {
    return j(400, { ok: false, error: 'Recipient must be +977 and start with 97/98' });
  }

  // 4) Send via Aakash
  if (!AAKASH_KEY) return j(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  const local = String(recipient).replace('+977', ''); // Aakash expects local 98XXXXXXXX

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({ to: [local], text: message }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return j(502, { ok: false, error: `Aakash error ${res.status}: ${txt.slice(0, 200)}` });
    }
    return j(200, { ok: true });
  } catch (e: any) {
    return j(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
