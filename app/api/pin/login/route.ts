import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type Body = {
  method: 'phone' | 'email';
  user: string;
  pin: string;
  next?: string;
};

function isArgon2(hash: string) { return hash.startsWith('$argon2'); }
function isBcrypt(hash: string) { return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'); }

async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  // Attempt Argon2, then bcrypt. Fail closed if neither available.
  if (isArgon2(hash)) {
    try {
      const { verify } = await import('@node-rs/argon2');
      return await verify(hash, pin, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    } catch {
      throw new Error('Argon2 module missing: install @node-rs/argon2');
    }
  }
  if (isBcrypt(hash)) {
    try {
      const bcrypt = await import('bcryptjs');
      return await bcrypt.compare(pin, hash);
    } catch {
      throw new Error('bcrypt module missing: install bcryptjs');
    }
  }
  throw new Error('Unsupported PIN hash format');
}

function normalizeNepPhone(input: string) {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('977')) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+977' + digits;
  }
  return '+' + digits; // last resort
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const method = body?.method;
  const user = (body?.user || '').trim().toLowerCase();
  const pin = (body?.pin || '').trim();
  if (!method || !user || !pin) return new NextResponse('Missing fields', { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    let authUserId: string | null = null;
    let emailForSession: string | null = null;

    if (method === 'email') {
      const { data, error } = await admin.auth.admin.getUserByEmail(user);
      if (error || !data?.user) return new NextResponse('User not found', { status: 404 });
      authUserId = data.user.id;
      emailForSession = data.user.email ?? null;
    } else {
      // phone
      const phone = normalizeNepPhone(user);
      const list = await admin.auth.admin.listUsers({ phone });
      const found = list?.data?.users?.find((u: any) => u.phone === phone);
      if (!found) return new NextResponse('User not found', { status: 404 });
      authUserId = found.id;
      // If phone-only account, we can still mint session via phone OTP exchange.
      emailForSession = found.email ?? null;
    }

    // Lookup PIN factor
    const supa = getSupabaseServer();
    const { data: factorRows, error: factorErr } = await supa
      .from('trusted_factors')
      .select('factor_type,pin_hash,failed_attempts,locked_until')
      .eq('auth_user_id', authUserId)
      .eq('factor_type', 'pin')
      .limit(1)
      .maybeSingle();

    if (factorErr) return new NextResponse('PIN not set', { status: 404 });
    if (!factorRows) return new NextResponse('PIN not set', { status: 404 });

    const factor = factorRows as any;
    if (factor.locked_until && new Date(factor.locked_until) > new Date()) {
      return new NextResponse('Too many attempts. Try later.', { status: 429 });
    }

    const ok = await verifyPinHash(pin, factor.pin_hash);
    if (!ok) {
      // increment attempts
      const attempts = (factor.failed_attempts ?? 0) + 1;
      const updates: any = { failed_attempts: attempts };
      if (attempts >= 5) {
        const locked = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        updates.locked_until = locked;
      }
      await supa
        .from('trusted_factors')
        .update(updates)
        .eq('auth_user_id', authUserId)
        .eq('factor_type', 'pin');
      return new NextResponse('Invalid PIN', { status: 401 });
    }

    // reset attempts
    await supa
      .from('trusted_factors')
      .update({ failed_attempts: 0, locked_until: null })
      .eq('auth_user_id', authUserId)
      .eq('factor_type', 'pin');

    // Mint a Supabase session by server-side OTP exchange
    const resp = NextResponse.json({ ok: true });
    const bound = getSupabaseServer(resp); // overload to bind to this response

    if (method === 'email') {
      // generate email magic link and exchange token on server
      const gl = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: emailForSession!,
      });
      if (!gl?.data?.email_otp) return new NextResponse('Session mint failed', { status: 500 });

      const verify = await bound.auth.verifyOtp({
        type: 'email',
        email: emailForSession!,
        token: gl.data.email_otp,
      });
      if (verify.error) return new NextResponse('Verify failed', { status: 500 });
    } else {
      // phone flow
      const phone = normalizeNepPhone(user);
      const gl = await admin.auth.admin.generateLink({
        type: 'sms',
        phone,
      } as any);
      const smsOtp: string | null = (gl as any)?.data?.sms_otp ?? null;
      if (!smsOtp) return new NextResponse('Session mint failed', { status: 500 });
      const verify = await bound.auth.verifyOtp({
        type: 'sms',
        phone,
        token: smsOtp,
      } as any);
      if (verify.error) return new NextResponse('Verify failed', { status: 500 });
    }

    return resp;
  } catch (e: any) {
    return new NextResponse(e?.message || 'Login failed', { status: 500 });
  }
}
