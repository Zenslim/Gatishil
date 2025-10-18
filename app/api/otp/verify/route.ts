import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { normalizeNepal } from '@/lib/phone/nepal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('NO_SERVICE_ROLE');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  let phone = '';
  let code = '';

  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object') {
      phone = typeof (body as any).phone === 'string' ? (body as any).phone : String((body as any).phone ?? '');
      code = typeof (body as any).code === 'string' ? (body as any).code : String((body as any).code ?? '');
    }
  } catch {
    // ignore malformed JSON; we'll validate below
  }

  const trimmedCode = code.trim();
  if (!trimmedCode || trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
    return badRequest('Enter the 6-digit code.');
  }

  const providerPhone = normalizeNepal(typeof phone === 'string' ? phone : String(phone ?? ''));

  if (!providerPhone) {
    return badRequest('Phone OTP is Nepal-only. use email.');
  }

  const codeHash = hashCode(trimmedCode);
  const plusPhone = `+${providerPhone}`;
  let supabaseAdmin;

  try {
    supabaseAdmin = admin();
  } catch (error: any) {
    if (error?.message === 'NO_SERVICE_ROLE') {
      return NextResponse.json({ ok: false, message: 'Auth unavailable. Use email.' }, { status: 503 });
    }
    throw error;
  }

  try {
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

    const storedHash = typeof otpRow.code_hash === 'string' ? otpRow.code_hash : '';
    if (storedHash !== codeHash) {
      await supabaseAdmin
        .from('otps')
        .update({ attempts: (otpRow.attempts ?? 0) + 1 })
        .eq('id', otpRow.id)
        .catch(() => {});

      return badRequest('Invalid code.');
    }

    const { error: consumeError } = await supabaseAdmin
      .from('otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otpRow.id)
      .is('consumed_at', null);

    if (consumeError) {
      throw consumeError;
    }

    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByPhone(plusPhone);

    if (getUserError && !/not found/i.test(getUserError.message ?? '')) {
      throw getUserError;
    }

    let userId = existingUser?.user?.id ?? existingUser?.data?.user?.id ?? null;

    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({
        phone: plusPhone,
        phone_confirm: true,
        user_metadata: { phone_verified: true },
      });

      if (created.error && !/already exists|registered/i.test(created.error.message ?? '')) {
        throw created.error;
      }

      userId = created.data?.user?.id ?? created.user?.id ?? null;

      if (!userId) {
        const { data: refetched, error: refetchError } = await supabaseAdmin.auth.admin.getUserByPhone(plusPhone);
        if (refetchError || !refetched?.user) {
          return NextResponse.json({ ok: false, message: 'Auth unavailable. Use email.' }, { status: 503 });
        }
        userId = refetched.user.id;
      }
    }

    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({ user_id: userId });

    if (sessionError || !sessionData?.session) {
      return NextResponse.json({ ok: false, message: 'Auth unavailable. Use email.' }, { status: 503 });
    }

    const session = sessionData.session;

    await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, phone: plusPhone }, { onConflict: 'id' })
      .catch((profileError) => {
        // eslint-disable-next-line no-console
        console.warn('[otp/verify] Failed to upsert profile phone', profileError);
      });

    return NextResponse.json(
      {
        ok: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error?.message === 'NO_SERVICE_ROLE') {
      return NextResponse.json({ ok: false, message: 'Auth unavailable. Use email.' }, { status: 503 });
    }

    // eslint-disable-next-line no-console
    console.error('[otp/verify] unexpected error', error);
    return NextResponse.json(
      { ok: false, message: 'Could not verify code. Please try again.' },
      { status: 400 },
    );
  }
}
