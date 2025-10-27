import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { derivePasswordFromPin, genSalt } from '@/lib/crypto/pin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const PIN_PEPPER = process.env.PIN_PEPPER;
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

type PinRequest = {
  pin?: string;
};

const respond = (body: Record<string, unknown>, status = 500) =>
  NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) {
      return new NextResponse('Trust PIN disabled', { status: 404 });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON || !SERVICE_ROLE || !PIN_PEPPER) {
      return respond({ error: 'Server misconfigured' });
    }

    const { pin } = (await req.json().catch(() => ({} as PinRequest))) as PinRequest;
    if (!pin || !/^\d{4,8}$/.test(String(pin))) {
      return respond({ error: 'PIN must be 4–8 digits' }, 400);
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: cookieStore });

    const {
      data: { user },
      error: sessionErr,
    } = await supabase.auth.getUser();

    if (sessionErr) {
      return respond({ error: 'Failed to read session' });
    }

    if (!user?.id) {
      return respond({ error: 'Not authenticated' }, 401);
    }

    const userId = user.id;

    const svc = createServiceClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data: adminUser, error: adminUserErr } = await svc.auth.admin.getUserById(userId);
    if (adminUserErr) {
      return respond({ error: 'Failed to load account identity', details: adminUserErr.message });
    }

    let email = adminUser.user?.email ?? user.email ?? '';
    const emailConfirmed = Boolean(adminUser.user?.email_confirmed_at);

    if (!email) {
      email = `${userId}@gn.local`;
      const { error: assignErr } = await svc.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });
      if (assignErr) {
        return respond({ error: 'Failed to assign canonical email', details: assignErr.message });
      }
    } else if (!emailConfirmed) {
      const { error: confirmErr } = await svc.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmErr) {
        return respond({ error: 'Failed to confirm email', details: confirmErr.message });
      }
    }

    if (email) {
      await svc.from('profiles').upsert({ id: userId, email }, { onConflict: 'id' });
    }

    const saltBuf = genSalt(16);
    const saltB64 = saltBuf.toString('base64');

    const { derivedB64u } = await derivePasswordFromPin({
      pin,
      userId,
      salt: saltBuf,
      pepper: PIN_PEPPER,
    });

    const pinPayload = {
      user_id: userId,
      salt: saltB64,
      salt_b64: saltB64,
      kdf: 'scrypt-v1(N=8192,r=8,p=1)',
      pin_retries: 0,
      locked_until: null,
    } as Record<string, unknown>;

    let { error: upsertErr } = await svc
      .from('auth_local_pin')
      .upsert(pinPayload, { onConflict: 'user_id' });

    if (upsertErr && /column "salt_b64"/i.test(upsertErr.message ?? '')) {
      const fallbackPayload = { ...pinPayload };
      delete fallbackPayload.salt_b64;
      const fallback = await svc.from('auth_local_pin').upsert(fallbackPayload, { onConflict: 'user_id' });
      upsertErr = fallback.error;
    }

    if (upsertErr) {
      return respond({ error: 'Failed to store PIN', details: upsertErr.message });
    }

    const { error: passwordErr } = await svc.auth.admin.updateUserById(userId, {
      password: derivedB64u,
    });

    if (passwordErr) {
      return respond({ error: 'Failed to sync auth password', details: passwordErr.message });
    }

    await supabase.auth.signOut();

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: derivedB64u,
    });

    if (signInErr) {
      return respond({ error: 'PIN write verification failed', details: signInErr.message });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token || !session?.refresh_token) {
      return respond({ error: 'No session returned after re-sign-in' });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return respond({ error: e?.message || 'Unexpected error' });
  }
}
