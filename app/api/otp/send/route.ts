import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Nepal-only AakashSMS OTP sender with 30s resend cooldown per phone
export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone?.startsWith('+977'))
      return NextResponse.json({ ok: false, error: 'Phone OTP is Nepal-only.' });

    // Enforce 30s resend cooldown (server-side)
    const { data: sent } = await supabase
      .from('otp_sends')
      .select('last_sent_at')
      .eq('phone', phone)
      .maybeSingle();

    if (sent?.last_sent_at) {
      const last = new Date(sent.last_sent_at).getTime();
      const now = Date.now();
      if (now - last < 30_000) {
        return NextResponse.json({ ok: false, error: 'RESEND_COOLDOWN' }, { status: 429 });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const res = await fetch('https://sms.aakashsms.com/v3/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: process.env.AAKASH_SMS_API_KEY,
        to: phone.replace('+977', ''),
        text: `Your Gatishil code is ${code}`,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'SMS gateway failed');

    await supabase.from('otps').insert({ phone, code });
    await supabase.from('otp_sends')
      .upsert({ phone, last_sent_at: new Date().toISOString() }, { onConflict: 'phone' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('OTP send failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to send OTP' },
      { status: 503 }
    );
  }
}
