import { NextResponse } from 'next/server';
import { randomInt, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { canSendOtp } from '@/lib/auth/rateLimit';
import { normalizeNepalToDB } from '@/lib/phone/nepal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function safeJson(req: Request) {
  try {
    const data = await req.json();
    if (data && typeof data === 'object') {
      return data;
    }
    return {};
  } catch {
    return {};
  }
}

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

type StructuredError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  const body: StructuredError = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  if (extra && Object.keys(extra).length > 0) {
    Object.assign(body.error, { details: extra });
  }

  return NextResponse.json(body, { status });
}

function userError(code: string, message: string, extra?: Record<string, unknown>) {
  return errorResponse(400, code, message, extra);
}

function infraError(code: string, message: string, extra?: Record<string, unknown>) {
  return errorResponse(503, code, message, extra);
}

async function sendAakashSms(apiKey: string, dbPhone: string, text: string) {
  const e164NoPlus = dbPhone;
  const national = dbPhone.replace(/^977/, '');

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

export async function POST(req: Request) {
  try {
    const body: any = await safeJson(req);
    const dbPhone = normalizeNepalToDB(body?.phone);

    if (!dbPhone) {
      return userError('invalid_phone', 'Phone OTP is Nepal-only. Use email.');
    }

    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const key = `otp:${dbPhone}:${ip}`;

    if (!canSendOtp(key)) {
      return userError('too_many_attempts', 'Too many attempts. Try again later.');
    }

    const code = generateOtp();
    const code_hash = hashOtp(code);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return infraError(
        'supabase_env_missing',
        'SMS is temporarily unavailable. Please use email.',
      );
    }

    const sb = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const insertPayload = {
      phone: dbPhone,
      code_hash,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    };

    const masked = dbPhone.replace(/^9779(\d{5})\d{4}$/, '9779$1••••');
    // eslint-disable-next-line no-console
    console.log('[otp/send] about to insert', {
      dbPhone,
      masked,
      len: dbPhone.length,
      jsRegexOk: /^9779\d{9}$/.test(dbPhone),
    });

    const { error: insErr } = await sb
      .from('otps')
      .insert(insertPayload, { returning: 'minimal' });

    if (insErr) {
      // eslint-disable-next-line no-console
      console.error('[otp/send] insert_error', {
        code: insErr.code,
        message: insErr.message,
        details: insErr.details,
        hint: insErr.hint,
        insertPayload,
      });
      return userError('invalid_phone_format', 'Phone format rejected by DB.');
    }

    const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;
    const apiKey = process.env.AAKASH_SMS_API_KEY;

    if (!apiKey) {
      await sb
        .from('otps')
        .delete()
        .eq('phone', dbPhone)
        .eq('code_hash', code_hash)
        .catch(() => {});
      return infraError('sms_disabled', 'SMS is temporarily unavailable. Please use email.');
    }

    try {
      await sendAakashSms(apiKey, dbPhone, text);
      return okResponse();
    } catch (error) {
      await sb
        .from('otps')
        .delete()
        .eq('phone', dbPhone)
        .eq('code_hash', code_hash)
        .catch(() => {});
      const details =
        error && typeof error === 'object' && 'status' in error
          ? { provider_status: (error as any).status }
          : undefined;
      return infraError('sms_provider_failure', 'Aakash SMS failed', details);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[otp/send] unexpected_error', error);
    return infraError('unexpected_error', 'SMS is temporarily unavailable. Please use email.');
  }
}
