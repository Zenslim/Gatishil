import { NextResponse } from 'next/server';
import { isEmail } from '@/lib/auth/validate';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { getAdminSupabase } from '@/lib/admin';

export const runtime = 'nodejs';

const NEPAL_E164 = /^\+977\d{8,11}$/;

function cleanPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+977')) return `+977${digits.slice(4)}`;
  if (digits.startsWith('977')) return `+${digits}`;
  if (digits.startsWith('0')) return `+977${digits.slice(1)}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function formatForGateway(phone: string) {
  return phone.replace(/^\+/, '');
}

function env(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

async function mintSupabaseSmsOtp(phone: string) {
  const supabase = getAdminSupabase();

  const generate = async () => supabase.auth.admin.generateLink({
    // @ts-expect-error: supabase typings omit sms body extras in some versions
    type: 'sms',
    phone,
  });

  let { data, error } = await generate();
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('not found') || msg.includes('no user')) {
      const create = await supabase.auth.admin.createUser({
        phone,
        email: undefined,
        phone_confirm: false,
      } as any);
      if (create.error && !/already exists|registered/i.test(create.error.message ?? '')) {
        throw new Error(create.error.message);
      }
      ({ data, error } = await generate());
    }
  }

  if (error) {
    throw new Error(error.message || 'Failed to generate OTP');
  }

  const props = (data as any)?.properties ?? {};
  const otp: string | undefined =
    props.phone_otp || props.otp || props.sms_otp || props.token || (data as any)?.otp;

  if (!otp) {
    throw new Error('Supabase OTP missing');
  }

  return otp;
}

async function sendAakashSms(phone: string, text: string) {
  const base = env('AAKASH_SMS_BASE_URL').replace(/\/$/, '');
  const apiKey = env('AAKASH_SMS_API_KEY');
  const sender = env('AAKASH_SMS_SENDER');

  const payload = { from: sender, to: formatForGateway(phone), text };
  const res = await fetch(`${base}/sms/send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => '');
  }

  const success =
    res.ok &&
    ((body && typeof body === 'object' &&
      (body.success === true ||
        body.success === 'true' ||
        (typeof body.status === 'string' && body.status.toLowerCase() === 'success') ||
        (typeof body.code === 'number' && body.code >= 200 && body.code < 300))) ||
      body === '' || body === null);

  if (!success) {
    const msg =
      (body && typeof body === 'object' && (body.message || body.error || body.reason)) ||
      (typeof body === 'string' && body) ||
      `Aakash SMS failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
}

function okResponse() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  let email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  let phoneInput = typeof payload?.phone === 'string' ? payload.phone.trim() : '';

  if (!phoneInput && typeof payload?.identifier === 'string') {
    const identifier = payload.identifier.trim();
    if (identifier) {
      if (isEmail(identifier)) {
        if (!email) {
          email = identifier;
        }
      } else {
        phoneInput = identifier;
      }
    }
  }

  if (phoneInput) {
    const phone = cleanPhone(phoneInput);
    if (!phone) {
      return errorResponse('Enter a valid phone number.', 400);
    }

    if (!phone.startsWith('+977')) {
      return errorResponse('Phone OTP is Nepal-only. use email.', 400);
    }

    if (!NEPAL_E164.test(phone)) {
      return errorResponse('Enter a valid phone number.', 400);
    }

    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const key = `otp:${phone}:${ip}`;
    if (!canSendOtp(key)) {
      return errorResponse('Too many attempts. Try again later.', 429);
    }

    try {
      const code = await mintSupabaseSmsOtp(phone);
      const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;
      await sendAakashSms(phone, text);
      return okResponse();
    } catch (error: any) {
      const message = error?.message || 'Could not send OTP. Please use email.';
      const status = Number(error?.status) ||
        (typeof error?.message === 'string' && /supabase/i.test(error.message) ? 502 : 500);

      if (message.includes('Missing env')) {
        return errorResponse('SMS is temporarily unavailable. Please use email.', 503);
      }

      return errorResponse(message, status >= 400 && status < 600 ? status : 500);
    }
  }

  if (email) {
    if (!isEmail(email)) {
      return errorResponse('Enter a valid email.', 400);
    }
    return okResponse();
  }

  return errorResponse('Provide phone (+977) or use email.', 400);
}
