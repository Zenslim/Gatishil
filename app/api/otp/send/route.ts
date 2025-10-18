import { NextResponse } from 'next/server';
import { randomInt, createHash } from 'node:crypto';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { getAdminSupabase } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NEPAL_MOBILE = /^\+97798\d{8}$/;
const OTP_TTL_MS = 5 * 60 * 1000;

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

async function persistOtp(phone: string, code: string, expiresAt: string) {
  const supabase = getAdminSupabase();
  const hashed = hashOtp(code);
  const { data, error } = await supabase
    .from('otps')
    .insert({ phone, code_hash: hashed, expires_at: expiresAt, meta: { channel: 'sms' } })
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
  const apiKey = env('AAKASH_SMS_API_KEY');

  const payload = { to: providerPhone, text };
  const res = await fetch('https://sms.aakashsms.com/v2/sms/send', {
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
  let phone = '';

  try {
    const body = await req.json();
    phone = (body?.phone ?? '').toString();
  } catch {
    // fall through to validation error
  }

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

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const key = `otp:${normalized}:${ip}`;

  if (!canSendOtp(key)) {
    return errorResponse('Too many attempts. Try again later.', 429);
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  let persistedId: number | undefined;

  try {
    persistedId = await persistOtp(normalized, code, expiresAt);
  } catch (error: any) {
    const message =
      typeof error?.message === 'string' && error.message.trim()
        ? error.message
        : 'Could not send OTP. Please try again.';
    const status = Number(error?.status) || 500;
    return errorResponse(message, status >= 400 && status < 600 ? status : 500);
  }

  if (!persistedId) {
    return errorResponse('Could not send OTP. Please try again.', 500);
  }

  const providerPhone = providerFormat(normalized);
  const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;

  try {
    await sendAakashSms(providerPhone, text);
    return okResponse();
  } catch (error) {
    await discardOtp(persistedId).catch(() => {});
    // eslint-disable-next-line no-console
    console.error('Aakash SMS failed', error);
    return errorResponse('Aakash SMS failed', 503);
  }
}
