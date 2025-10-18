import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getAdminSupabase } from '@/lib/admin';
import { NEPAL_MOBILE, normalizeOtpPhone } from '@/lib/auth/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeString(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function serviceError(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 503 });
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export async function POST(req: Request) {
  let phone = '';
  let code = '';

  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object') {
      phone = safeString((body as any).phone ?? '');
      code = safeString((body as any).code ?? '');
    }
  } catch {
    // ignore malformed JSON; we'll validate below
  }

  phone = phone.trim();
  code = code.trim();

  if (!phone) {
    return badRequest('Enter your phone number.');
  }

  const normalized = normalizeOtpPhone(phone);

  if (!normalized) {
    return badRequest('Enter a valid phone number.');
  }

  if (!normalized.startsWith('+977')) {
    return badRequest('Phone OTP is Nepal-only. use email.');
  }

  if (!NEPAL_MOBILE.test(normalized)) {
    return badRequest('Enter a valid phone number.');
  }

  if (!code) {
    return badRequest('Enter the 6-digit code.');
  }

  if (!/^\d{6}$/.test(code)) {
    return badRequest('Enter the 6-digit code.');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return serviceError('Auth unavailable. Use email.');
  }

  const providerPhone = normalized;
  const hashedCode = hashCode(code).toLowerCase();

  try {
    const supabaseAdmin = getAdminSupabase();

    const { data: otpRow, error: selectError } = await supabaseAdmin
      .from('otps')
      .select('id, code_hash, attempts')
      .eq('phone', providerPhone)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (!otpRow) {
      return badRequest('Code expired or not found.');
    }

    const storedHash = typeof otpRow.code_hash === 'string' ? otpRow.code_hash.toLowerCase() : '';
    const matches = storedHash === hashedCode;

    if (!matches) {
      await supabaseAdmin
        .from('otps')
        .update({ attempts: (otpRow.attempts ?? 0) + 1 })
        .eq('id', otpRow.id)
        .catch(() => {});

      return badRequest('Invalid code.');
    }

    const consumedAt = new Date().toISOString();
    const { error: consumeError } = await supabaseAdmin
      .from('otps')
      .update({ consumed_at: consumedAt })
      .eq('id', otpRow.id)
      .is('consumed_at', null);

    if (consumeError) {
      throw consumeError;
    }

    const adminAuth = supabaseAdmin.auth.admin as any;
    if (!adminAuth || typeof adminAuth.createSession !== 'function') {
      return serviceError('Auth unavailable. Use email.');
    }

    let user: any = null;

    if (typeof adminAuth.listUsers === 'function') {
      const listed = await adminAuth.listUsers({ page: 1, perPage: 200 });
      if (listed?.error) {
        throw new Error(listed.error.message || 'User lookup failed');
      }
      const users: any[] = listed?.data?.users ?? listed?.users ?? [];
      user = users.find((u: any) => u?.phone === normalized) ?? null;
    }

    if (!user) {
      const created = await adminAuth.createUser({
        phone: normalized,
        phone_confirm: true,
        user_metadata: { phone_verified: true },
      });

      if (created?.error && !/already exists|registered/i.test(created.error.message ?? '')) {
        throw new Error(created.error.message || 'Could not create user');
      }

      user = created?.data?.user ?? created?.user ?? null;

      if (!user && typeof adminAuth.listUsers === 'function') {
        const listed = await adminAuth.listUsers({ page: 1, perPage: 200 });
        if (listed?.error) {
          throw new Error(listed.error.message || 'User lookup failed');
        }
        const users: any[] = listed?.data?.users ?? listed?.users ?? [];
        user = users.find((u: any) => u?.phone === normalized) ?? null;
      }
    }

    if (!user?.id) {
      return serviceError('Auth unavailable. Use email.');
    }

    const { data: sessionData, error: sessionError } = await adminAuth.createSession({ user_id: user.id });

    if (sessionError || !sessionData?.session) {
      return serviceError('Could not start session.');
    }

    const session = sessionData.session;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, phone: normalized }, { onConflict: 'id' });

    if (profileError) {
      // eslint-disable-next-line no-console
      console.warn('[otp/verify] Failed to upsert profile phone', profileError);
    }

    return NextResponse.json(
      {
        ok: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user ?? user,
      },
      { status: 200 },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[otp/verify] unexpected error', error);
    return serviceError('Verification is temporarily unavailable. Please try again.');
  }
}
