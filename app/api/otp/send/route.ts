// app/api/otp/send/route.ts — AakashSMS v3 send using auth_token (per docs)
// ELI15: We create a 6-digit code, save it, then call AakashSMS with {auth_token, to, text}.
// IMPORTANT: In Vercel env, set AAKASH_SMS_API_KEY to your AakashSMS "auth_token" value.

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AAKASH_API_KEY = process.env.AAKASH_SMS_API_KEY || ''; // <-- your AakashSMS auth_token
const AAKASH_FROM = process.env.AAKASH_SMS_FROM || 'GATISHIL'; // used only in text, not as sender id

export async function OPTIONS() {
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function sixDigit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Convert +97798XXXXXXXX → 98XXXXXXXX (10 digits). If other format, keep last 10 digits.
function toNepalLocal(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length >= 12) return digits.slice(-10);
  return digits.slice(-10);
}

export async function POST(req: Request) {
  try {
    const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 });
    }

    const code = sixDigit();
    const supabase = getServerSupabase();

    // store OTP (so /verify can read it)
    const { error: ierr } = await supabase.from('otps').insert([{ phone, code }]);
    if (ierr) return NextResponse.json({ ok: false, error: ierr.message }, { status: 500 });

    if (!AAKASH_API_KEY) {
      // No key set: return ok with warning so UI continues, but tell you why SMS didn’t go.
      return NextResponse.json({ ok: true, warn: 'AAKASH_SMS_API_KEY not set' }, { status: 200 });
    }

    const local = toNepalLocal(phone);
    const message = `Your Gatishil verification code is ${code}. It expires in 5 minutes. - ${AAKASH_FROM}`;

    // Per AakashSMS docs: POST /sms/v3/send with form or query: auth_token, to (comma-separated 10-digit), text
    // We'll send application/x-www-form-urlencoded
    const body = new URLSearchParams({
      auth_token: AAKASH_API_KEY,
      to: local,            // single 10-digit
      text: message,
    });

    const resp = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const contentType = resp.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await resp.json().catch(() => ({}))
      : await resp.text().catch(() => '');

    // AakashSMS typically returns JSON with fields like 'error' or 'success'
    if (!resp.ok) {
      const errMsg =
        (typeof payload === 'object' && (payload.error || payload.message)) ||
        (typeof payload === 'string' && payload) ||
        `HTTP ${resp.status}`;
      return NextResponse.json({ ok: true, warn: `Provider error: ${errMsg}` }, { status: 200 });
    }

    // Provider success (but still surface any non-standard messages)
    return NextResponse.json({ ok: true, info: typeof payload === 'string' ? payload : undefined }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
