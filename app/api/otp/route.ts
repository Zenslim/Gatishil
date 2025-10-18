// app/api/otp/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { getAdminSupabase } from '@/lib/admin';

const OTP_TTL_MS = 5 * 60 * 1000;
const NEPAL_MOBILE = /^\+97798\d{8}$/;

function normalizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const raw = trimmed.replace(/[\s-]/g, '');
  const prefixed = raw.startsWith('+') ? raw : `+${raw}`;
  if (!/^\+\d{9,15}$/.test(prefixed)) return '';
  if (!prefixed.startsWith('+977')) return prefixed;
  return `+${prefixed.replace(/^\+/, '')}`;
}

function hashOtp(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

async function ensurePhoneUser(client: ReturnType<typeof getAdminSupabase>, phone: string) {
  const admin = client.auth.admin as any;

  if (!admin || typeof admin.createUser !== 'function') {
    throw new Error('Supabase admin unavailable');
  }

  let user: any = null;
  const created = await admin.createUser({ phone, phone_confirm: true });
  if (created?.data?.user || created?.user) {
    user = created?.data?.user ?? created?.user;
  } else if (created?.error && !/already exists|registered/i.test(created.error.message ?? '')) {
    throw new Error(created.error.message);
  }

  if (!user) {
    if (typeof admin.listUsers === 'function') {
      const listed = await admin.listUsers({ page: 1, perPage: 200 });
      user = listed?.data?.users?.find((u: any) => u.phone === phone) ?? null;
      if (!user && listed?.error) {
        throw new Error(listed.error.message || 'Phone user lookup failed');
      }
    }
  }

  if (!user) {
    throw new Error('Phone user missing');
  }

  return { admin, user };
}

/**
 * Single source of truth for verifying OTP + Magic Link.
 * Body (one of):
 *  - { type: 'sms', phone: '+977...', token: '123456' }
 *  - { type: 'email', email: 'user@example.com', token: '123456' }
 *  - { type: 'email', token_hash: '...hash from magic link...' }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type: 'sms' | 'email' | undefined = body?.type ?? (body?.phone ? 'sms' : body?.email ? 'email' : undefined);
    const phone: string | undefined = body?.phone;
    const email: string | undefined = body?.email;
    const token: string | undefined = body?.token ?? body?.code;
    const token_hash: string | undefined = body?.token_hash;

    if (type !== 'sms' && type !== 'email') {
      return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 });
    }

    if (type === 'sms') {
      if (!phone || typeof token !== 'string' || token.trim().length < 4) {
        return NextResponse.json({ ok: false, error: 'Invalid or expired code.' }, { status: 400 });
      }

      const normalized = normalizePhone(phone);
      if (!normalized) {
        return NextResponse.json({ ok: false, error: 'Invalid phone number.' }, { status: 400 });
      }
      if (!NEPAL_MOBILE.test(normalized)) {
        return NextResponse.json({ ok: false, error: 'Phone OTP is Nepal-only. use email.' }, { status: 400 });
      }

      const supabaseAdmin = getAdminSupabase();
      const hashed = hashOtp(token.trim());
      const { data: rows, error: selectError } = await supabaseAdmin
        .from('otps')
        .select('id, code, created_at, used_at')
        .eq('phone', normalized)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (selectError) {
        return NextResponse.json(
          { ok: false, error: 'Could not verify code. Please try again.' },
          { status: 500 }
        );
      }

      const now = Date.now();
      const match = (rows ?? []).find((row: any) => {
        if (!row?.created_at || !row?.code) return false;
        const age = now - new Date(row.created_at).getTime();
        if (Number.isNaN(age) || age > OTP_TTL_MS) return false;
        try {
          return timingSafeEqual(Buffer.from(row.code, 'hex'), Buffer.from(hashed, 'hex'));
        } catch {
          return row.code === hashed;
        }
      });

      if (!match) {
        return NextResponse.json({ ok: false, error: 'Invalid or expired code.' }, { status: 401 });
      }

      await supabaseAdmin
        .from('otps')
        .update({ used_at: new Date().toISOString() })
        .eq('id', match.id)
        .is('used_at', null);

      const { admin, user } = await ensurePhoneUser(supabaseAdmin, normalized);
      if (typeof admin.createSession !== 'function') {
        return NextResponse.json(
          { ok: false, error: 'SMS login unavailable. Please use email.' },
          { status: 503 }
        );
      }

      const { data: sessionData, error: sessionError } = await admin.createSession({ user_id: user.id });

      if (sessionError || !sessionData?.session) {
        return NextResponse.json(
          { ok: false, error: sessionError?.message || 'Could not start session.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          status: 'ready',
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            expires_in: sessionData.session.expires_in,
            token_type: sessionData.session.token_type,
          },
          user: sessionData.session.user ?? user,
        },
        { status: 200 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp(
      token_hash
        ? { type: 'email', token_hash }
        : { type: 'email', email: email!, token: token! }
    );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }

    const { data: sessionWrap } = await supabase.auth.getSession();
    const hasSession = !!sessionWrap?.session?.access_token;

    return NextResponse.json(
      { ok: true, status: hasSession ? 'ready' : 'pending' },
      { status: hasSession ? 200 : 202 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'OTP verification failed' },
      { status: 500 }
    );
  }
}
