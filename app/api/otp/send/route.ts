import { NextResponse } from 'next/server';
import { randomInt, createHash } from 'node:crypto';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { getAdminSupabase } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NEPAL_MOBILE = /^\+97798\d{8}$/;

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const raw = trimmed.replace(/[\s-]/g, '');
  if (!raw) return '';
  const prefixed = raw.startsWith('+') ? raw : `+${raw}`;
  const digits = prefixed.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) {
    return '';
  }
  if (!prefixed.startsWith('+977')) {
    return prefixed;
  }
  return `+${digits}`;
}

function providerFormat(phone: string) {
  return phone.slice(1);
}

function env(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

function generateOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashOtp(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

async function persistOtp(phone: string, code: string) {
  const supabase = getAdminSupabase();
  const hashed = hashOtp(code);
  const { data, error } = await supabase
    .from('otps')
    .insert({ phone, code_hash: hashed, meta: { channel: 'sms' } })
    .select('id')
    .single();

  if (error) {
    // Bubble up a cleaner message for the common constraint mismatch.
    if (error.message && /otps_code_check/i.test(error.message)) {
      throw new Error('SMS storage rejected the generated code.');
    }

    throw new Error(error.message || 'Failed to store OTP');
  }

  return data?.id as number | undefined;
}

async function discardOtp(id?: number) {
  if (!id) return;
  const supabase = getAdminSupabase();
  await supabase.from('otps').delete().eq('id', id);
}

async function sendAakashSms(providerPhone: string, text: string) {
  const base = env('AAKASH_SMS_BASE_URL').replace(/\/$/, '');
  const apiKey = env('AAKASH_SMS_API_KEY');
  const sender = env('AAKASH_SMS_SENDER');

  const payload = { from: sender, to: providerPhone, text };
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

  const logBody =
    body && typeof body === 'object'
      ? {
          success: body.success,
          status: body.status,
          code: body.code,
          message: body.message || body.error || body.reason,
        }
      : body;

  const logPayload = {
    status: res.status,
    ok: success,
    body: logBody,
  };

  // eslint-disable-next-line no-console
  console.info('Aakash SMS response', logPayload);

  if (!success) {
    const msg =
      (body && typeof body === 'object' && (body.message || body.error || body.reason)) ||
      (typeof body === 'string' && body) ||
      `Aakash SMS failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.provider = logPayload;
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
  let email = '';
  let phone = '';

  try {
    const body = await req.json();
    email = (body?.email ?? '').toString().trim();
    phone = (body?.phone ?? '').toString().trim();
  } catch {
    // keep empty email/phone
  }

  if (phone) {
    const normalized = normalizePhone(phone);

    if (!normalized) {
      return errorResponse('Enter a valid phone number.', 400);
    }

    if (!normalized.startsWith('+977')) {
      return errorResponse('Phone OTP is Nepal-only. use email.', 400);
    }

    if (!NEPAL_MOBILE.test(normalized)) {
      return errorResponse('Enter a valid phone number.', 400);
    }

    const providerPhone = providerFormat(normalized);
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const key = `otp:${normalized}:${ip}`;

    if (!canSendOtp(key)) {
      return errorResponse('Too many attempts. Try again later.', 429);
    }

    let persistedId: number | undefined;

    try {
      const code = generateOtp();
      persistedId = await persistOtp(normalized, code);
      const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;
      await sendAakashSms(providerPhone, text);
      return okResponse();
    } catch (error: any) {
      await discardOtp(persistedId).catch(() => {});

      let message = error?.message || 'Could not send OTP. Please use email.';

      if (typeof message === 'string' && /email address is required/i.test(message)) {
        message = 'Could not send OTP. Please use email.';
      }

      if (typeof message === 'string' && message.includes('Missing env')) {
        return errorResponse('SMS is temporarily unavailable. Please use email.', 503);
      }

      if (typeof message === 'string' && /sms otp unavailable/i.test(message)) {
        return errorResponse('SMS is temporarily unavailable. Please use email.', 503);
      }

      const status = Number(error?.status) ||
        (typeof error?.message === 'string' && /supabase/i.test(error.message) ? 502 : 500);

      return errorResponse(message, status >= 400 && status < 600 ? status : 500);
    }
  }

  if (email) {
    return errorResponse('Use the email OTP flow (unchanged).', 400);
  }

  return errorResponse('Provide phone (+977) or use email.', 400);
}
