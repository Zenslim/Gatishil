import { NextResponse } from 'next/server';
import { randomInt, createHash } from 'node:crypto';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { getAdminSupabase } from '@/lib/admin';
import { NEPAL_MOBILE } from '@/lib/auth/phone';
import { normalizeNepal } from '@/lib/phone/nepal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 5 * 60 * 1000;
const AAKASH_ENDPOINT = 'https://sms.aakashsms.com/sms/v3/send';

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
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

async function sendAakashSms(apiKey: string, normalizedPhone: string, text: string) {
  const e164NoPlus = normalizedPhone.slice(1);
  const national = e164NoPlus.replace(/^977/, '');

  type AttemptStatus = number | string | undefined;

  const attempt = async (to: string) => {
    try {
      const params = new URLSearchParams({ auth_token: apiKey, to, text });
      const res = await fetchWithTimeout(
        AAKASH_ENDPOINT,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params,
          cache: 'no-store',
        },
        6000,
      );

      const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
      let parsed: any = null;
      let rawText = '';

      if (contentType.includes('application/json')) {
        parsed = await res.json().catch(() => null);
        if (parsed !== null && parsed !== undefined) {
          rawText = JSON.stringify(parsed);
        } else {
          rawText = await res.text().catch(() => '');
        }
      } else {
        rawText = await res.text().catch(() => '');
      }

      const success = isProviderSuccess(res, parsed, rawText);
      const bodyForLog = rawText;

      return {
        ok: success,
        status: res.status as AttemptStatus,
        body: bodyForLog,
      };
    } catch (error: any) {
      const status: AttemptStatus = error?.name === 'AbortError' ? 'timeout' : 'error';
      const message = typeof error?.message === 'string' ? error.message : '';
      return {
        ok: false,
        status,
        body: message,
      };
    }
  };

  const first = await attempt(e164NoPlus);
  let second: { ok: boolean; status: AttemptStatus; body: string } | null = null;

  if (!first.ok && national !== e164NoPlus) {
    second = await attempt(national);
  }

  const status1 = first.status;
  const status2 = second ? second.status : national === e164NoPlus ? 'duplicate' : 'skipped';

  // eslint-disable-next-line no-console
  console.log('[otp/send] try:e164,national status:', status1, status2);

  if (first.ok || second?.ok) {
    return;
  }

  const failure = second ?? first;
  const status = failure.status ?? 'unknown';
  const body = failure.body ?? '';

  // eslint-disable-next-line no-console
  console.error('[otp/send] provider_error:', status, body.slice(0, 180));

  const error = new Error('Aakash SMS failed');
  (error as any).status = status;
  throw error;
}

function isProviderSuccess(res: Response, body: any, rawText: string) {
  if (!res.ok) {
    return false;
  }

  if (body && typeof body === 'object') {
    if ('error' in body) {
      const value = body.error;
      if (
        value === true ||
        value === 'true' ||
        (typeof value === 'number' && value !== 0) ||
        (typeof value === 'string' && value.trim() !== '' && value.trim() !== '0' && value.trim().toLowerCase() !== 'false')
      ) {
        return false;
      }
    }

    if ('success' in body) {
      const value = body.success;
      if (!successLike(value)) {
        return false;
      }
    }

    if ('status' in body) {
      const status = String(body.status).toLowerCase();
      if (status && status !== 'success' && status !== 'ok') {
        return false;
      }
    }

    if ('code' in body) {
      const code = Number(body.code);
      if (!Number.isNaN(code) && (code < 200 || code >= 300)) {
        return false;
      }
    }

    if ('response_code' in body) {
      const code = Number(body.response_code);
      if (!Number.isNaN(code) && (code < 200 || code >= 300)) {
        return false;
      }
    }
  }

  if (!body && typeof rawText === 'string') {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return true;
    }
    if (/error/i.test(trimmed) && !/success|sent|queued/i.test(trimmed)) {
      return false;
    }
  }

  return true;
}

function successLike(value: unknown) {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1' ||
    (typeof value === 'string' && value.toLowerCase() === 'success')
  );
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

  const providerPhone = normalizeNepal(phone);

  if (!providerPhone) {
    return errorResponse('Phone OTP is Nepal-only. use email.', 400);
  }

  const normalized = `+${providerPhone}`;

  if (!NEPAL_MOBILE.test(normalized)) {
    return errorResponse('Enter a valid phone number.', 400);
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const key = `otp:${providerPhone}:${ip}`;

  if (!canSendOtp(key)) {
    return errorResponse('Too many attempts. Try again later.', 429);
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  let persistedId: number | undefined;

  try {
    persistedId = await persistOtp(providerPhone, code, expiresAt);
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

  const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;
  const apiKey = process.env.AAKASH_SMS_API_KEY;

  if (!apiKey) {
    await discardOtp(persistedId).catch(() => {});
    return errorResponse('SMS is temporarily unavailable. Please use email.', 503);
  }

  try {
    await sendAakashSms(apiKey, normalized, text);
    return okResponse();
  } catch (error) {
    await discardOtp(persistedId).catch(() => {});
    return errorResponse('Aakash SMS failed', 503);
  }
}
