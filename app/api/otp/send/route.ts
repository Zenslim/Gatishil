import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeNepalMobile } from '@/lib/auth/phone';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const AAKASH_SMS_API_KEY = process.env.AAKASH_SMS_API_KEY;
const AAKASH_SENDER_ID = process.env.AAKASH_SENDER_ID || 'GATISHIL';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Supabase environment variables are not configured');
}

const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

function respond(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function sendSms(phone: string, code: string) {
  if (!AAKASH_SMS_API_KEY) {
    throw new Error('AAKASH_SMS_API_KEY missing');
  }

  const message = `Your Gatishil code is ${code}. It expires in 5 minutes.`;
  const body = new URLSearchParams({
    key: AAKASH_SMS_API_KEY,
    route: 'sms',
    sender: AAKASH_SENDER_ID,
    phone,
    text: message,
  });

  const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status === 'error') {
    throw new Error(data?.message || 'Aakash SMS failed');
  }

  return message;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  const rawPhone = typeof body.phone === 'string' ? body.phone : '';

  if (!rawEmail && !rawPhone) {
    return respond({ ok: false, message: 'Provide an email or phone number.' }, 400);
  }

  if (rawEmail) {
    try {
      const { error } = await supabasePublic.auth.signInWithOtp({
        email: rawEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: SITE_URL ? `${SITE_URL}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
      return respond({ ok: true, channel: 'email' });
    } catch (error: any) {
      return respond({ ok: false, channel: 'email', message: error?.message || 'Could not send email OTP.' }, 400);
    }
  }

  const normalized = normalizeNepalMobile(rawPhone || '');
  if (!normalized) {
    return respond({
      ok: false,
      channel: 'sms',
      message: 'Phone OTP is Nepal-only. Enter +97798… or use email.',
    }, 400);
  }

  const { data: recent } = await supabaseAdmin
    .from('otps')
    .select('id, created_at, status')
    .eq('phone', normalized)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    const latest = recent[0];
    const created = new Date(latest.created_at).getTime();
    if (Date.now() - created < 60_000) {
      return respond({
        ok: false,
        channel: 'sms',
        message: 'Please wait 60 seconds before requesting another code.',
      }, 429);
    }
  }

  try {
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'otp',
      phone: normalized,
      options: {
        channel: 'sms',
        shouldCreateUser: true,
      },
    });
    if (error) throw error;

    const code = link?.properties?.phone_otp;
    if (!code || typeof code !== 'string') {
      throw new Error('Supabase did not issue an OTP code.');
    }

    await sendSms(normalized, code);

    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { error: insertError } = await supabaseAdmin.from('otps').insert({
      phone: normalized,
      code,
      expires_at: expiresAt,
      status: 'sent',
    });
    if (insertError) throw insertError;

    return respond({ ok: true, channel: 'sms', message: 'OTP sent via SMS. It expires in 5 minutes.' });
  } catch (error: any) {
    return respond({ ok: false, channel: 'sms', message: error?.message || 'Could not send SMS OTP.' }, 400);
  }
}
