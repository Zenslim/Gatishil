import { createHash, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { isEmail } from '@/lib/auth/validate';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { OTP_TTL_SECONDS } from '@/lib/constants/auth';

const NEPAL_PHONE_REGEX = /^\+977\d{8,11}$/;

function success() {
  return NextResponse.json({ ok: true });
}

function genericFailure(status = 400) {
  return NextResponse.json({ ok: false }, { status });
}

async function sendSmsViaAakash(phone: string, code: string) {
  const apiKey = process.env.AAKASH_SMS_API_KEY;
  const sender = process.env.AAKASH_SMS_SENDER;
  if (!apiKey || !sender) {
    throw Object.assign(new Error('SMS unavailable'), { statusCode: 503 });
  }

  const payload = {
    sender,
    to: phone,
    text: `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`,
  };

  const response = await fetch('https://sms.aakashsms.com/sms/v3/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = new Error('SMS send failed');
    (error as any).statusCode = 503;
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined;

    if (email && isEmail(email)) {
      const supabase = createAdminClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return success();
    }

    if (!phone) {
      return success();
    }

    if (!NEPAL_PHONE_REGEX.test(phone)) {
      return genericFailure(400);
    }

    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const key = `otp:${phone}:${ip}`;
    if (!canSendOtp(key)) {
      return success();
    }

    const admin = createAdminClient();

    async function generateOtp() {
      return admin.auth.admin.generateLink({
        type: 'otp',
        phone,
      } as any);
    }

    let { data, error: linkError } = await generateOtp();

    if (linkError && /not found/i.test(linkError.message || '')) {
      const { error: createError } = await admin.auth.admin.createUser({
        phone,
        phone_confirm: false,
      } as any);
      if (createError && !/already/i.test(createError.message || '')) {
        return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
      }
      ({ data, error: linkError } = await generateOtp());
    }

    if (linkError) {
      return NextResponse.json({ ok: false, error: linkError.message }, { status: 500 });
    }

    const code = (data as any)?.properties?.phone_otp ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    const hashed =
      (data as any)?.properties?.hashed_token ?? createHash('sha256').update(code).digest('hex');

    const { error: insertError } = await admin
      .from('otps')
      .insert({ phone, code: hashed, meta: { ttl: OTP_TTL_SECONDS } });

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    await sendSmsViaAakash(phone, code);

    return success();
  } catch (error: any) {
    const status = error?.statusCode === 503 ? 503 : 500;
    if (status === 503) {
      return NextResponse.json({ ok: false }, { status });
    }
    return NextResponse.json({ ok: false }, { status });
  }
}
