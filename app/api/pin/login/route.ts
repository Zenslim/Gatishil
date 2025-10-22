export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type Body = {
  method: 'phone' | 'email';
  user: string;
  pin: string;
  next?: string;
};

async function verifyPinArgon2(pin: string, hash: string): Promise<boolean> {
  const { verify } = await import('@node-rs/argon2');
  return await verify(hash, pin, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

function normalizeNepPhone(input: string) {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('977')) return '+' + digits;
  if (digits.length === 10) return '+977' + digits;
  return '+' + digits;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const method = body?.method;
  const user = (body?.user || '').trim().toLowerCase();
  const pin = (body?.pin || '').trim();
  const next = (body?.next && typeof body.next === 'string') ? body.next : '/dashboard';
  if (!method || !user || !pin) return new NextResponse('Missing fields', { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    const supa = getSupabaseServer();

    // Identify user
    let authUserId: string | null = null;
    let emailForSession: string | null = null;
    if (method === 'email') {
      const { data, error } = await admin.auth.admin.getUserByEmail(user);
      if (error || !data?.user) return new NextResponse('User not found', { status: 404 });
      authUserId = data.user.id;
      emailForSession = data.user.email ?? null;
    } else {
      const phone = normalizeNepPhone(user);
      const list = await admin.auth.admin.listUsers({ phone });
      const found = list?.data?.users?.find((u: any) => u.phone === phone);
      if (!found) return new NextResponse('User not found', { status: 404 });
      authUserId = found.id;
      emailForSession = found.email ?? null;
    }

    // Load PIN factor
    const { data: factor, error: factorErr } = await supa
      .from('trusted_factors')
      .select('pin_hash,failed_attempts,locked_until')
      .eq('auth_user_id', authUserId)
      .eq('factor_type', 'pin')
      .maybeSingle();

    if (factorErr || !factor) return new NextResponse('PIN not set', { status: 404 });
    if (factor.locked_until && new Date(factor.locked_until) > new Date()) {
      return new NextResponse('Too many attempts. Try later.', { status: 429 });
    }

    const ok = await verifyPinArgon2(pin, factor.pin_hash as string);
    if (!ok) {
      const attempts = (factor.failed_attempts ?? 0) + 1;
      const updates: any = { failed_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await supa.from('trusted_factors')
        .update(updates)
        .eq('auth_user_id', authUserId)
        .eq('factor_type', 'pin');
      return new NextResponse('Invalid PIN', { status: 401 });
    }

    // reset attempts
    await supa.from('trusted_factors')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('auth_user_id', authUserId)
      .eq('factor_type', 'pin');

    // Mint session via server-side OTP exchange and immediately redirect (server-side)
    const redirectTo = new URL(next, req.url);
    const resp = NextResponse.redirect(redirectTo, 303);
    const bound = getSupabaseServer(resp);

    if (method === 'email') {
      if (!emailForSession) return new NextResponse('No email on user', { status: 400 });
      const gl = await admin.auth.admin.generateLink({ type: 'magiclink', email: emailForSession });
      if (!gl?.data?.email_otp) return new NextResponse('Session mint failed', { status: 500 });
      const verify = await bound.auth.verifyOtp({ type: 'email', email: emailForSession, token: gl.data.email_otp });
      if (verify.error) return new NextResponse('Verify failed', { status: 500 });
    } else {
      const phone = normalizeNepPhone(user);
      const gl = await admin.auth.admin.generateLink({ type: 'sms', phone } as any);
      const smsOtp: string | null = (gl as any)?.data?.sms_otp ?? null;
      if (!smsOtp) return new NextResponse('Session mint failed', { status: 500 });
      const verify = await bound.auth.verifyOtp({ type: 'sms', phone, token: smsOtp } as any);
      if (verify.error) return new NextResponse('Verify failed', { status: 500 });
    }

    return resp;
  } catch (e: any) {
    return new NextResponse(e?.message || 'Login failed', { status: 500 });
  }
}
