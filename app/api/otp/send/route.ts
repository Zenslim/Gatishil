// app/api/otp/send/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AAKASH_API_KEY = process.env.AAKASH_SMS_API_KEY || '';
const AAKASH_FROM = process.env.AAKASH_SMS_FROM || 'GATISHIL';

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

export async function POST(req: Request) {
  try {
    const { phone } = await req.json().catch(() => ({} as any));
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 });
    }

    const code = sixDigit();
    const supabase = getServerSupabase();
    const { error: ierr } = await supabase.from('otps').insert([{ phone, code }]);
    if (ierr) return NextResponse.json({ ok: false, error: ierr.message }, { status: 500 });

    // Send via AakashSMS v4
    let sent = false, apiError: string | null = null;
    try {
      if (!AAKASH_API_KEY) {
        apiError = 'AAKASH_SMS_API_KEY not set';
      } else {
        // AakashSMS expects local numbers for Nepal accounts; strip +977 if present
        const toLocal = phone.replace(/^\+977/, '');
        const message = `Your Gatishil verification code is ${code}. It expires in 5 minutes.`;

        const resp = await fetch('https://sms.aakashsms.com/sms/v3/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AAKASH_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: [toLocal], message, from: AAKASH_FROM }),
        });

        const data = await resp.json().catch(() => ({}));
        if (resp.ok) sent = true;
        else apiError = (data?.error || data?.message || `HTTP ${resp.status}`);
      }
    } catch (e: any) {
      apiError = e?.message || 'send failed';
    }

    return NextResponse.json({ ok: true, warn: sent ? undefined : apiError }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
