import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Server-only PIN writer
 * - Requires authenticated session (current user only)
 * - Stores NON-NULL salt in public.auth_local_pin
 * - Derives password = scrypt(pin:userId:PIN_PEPPER)
 * - Updates GoTrue password via Service Role
 * - Ensures a canonical email exists for phone-only accounts: {userId}@gn.local
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PIN_PEPPER = process.env.PIN_PEPPER!;
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const derive = (pin: string, userId: string, saltB64url: string, pepper: string) => {
  const saltStd = saltB64url.replace(/-/g, '+').replace(/_/g, '/');
  const salt = Buffer.from(saltStd, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const dk = (crypto as any).scryptSync(material, salt, 32, { N: 8192, r: 8, p: 1 }) as Buffer;
  return b64url(dk);
};

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!pin || !/^\d{4,8}$/.test(String(pin))) {
      return NextResponse.json({ error: 'PIN must be 4–8 digits' }, { status: 400 });
    }

    // Read current session
    const cookieStore = cookies();
    const supabaseSSR = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (setCookies) => { for (const { name, value, options } of setCookies) cookieStore.set(name, value, options); },
      },
    });
    const { data: auth } = await supabaseSSR.auth.getUser();
    const userId = auth?.user?.id;
    const currentEmail = auth?.user?.email ?? null;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Service role client
    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Ensure canonical email on auth.users if missing
    let email = currentEmail;
    if (!email) {
      const synthetic = `${userId}@gn.local`;
      const { error: updEmailErr } = await svc.auth.admin.updateUserById(userId, { email: synthetic });
      if (updEmailErr) return NextResponse.json({ error: 'Failed to assign canonical email' }, { status: 500 });
      email = synthetic;
      // also reflect into profiles so future lookups have email
      await svc.from('profiles').upsert({ id: userId, email: synthetic }, { onConflict: 'id' });
    }

    // Salt + derive
    const salt = b64url((crypto as any).randomBytes(16));
    const derivedPassword = derive(pin, userId, salt, PIN_PEPPER);

    // Upsert salt
    const { error: upErr } = await svc.from('auth_local_pin').upsert({ user_id: userId, salt }, { onConflict: 'user_id' });
    if (upErr) return NextResponse.json({ error: 'Failed to store PIN' }, { status: 500 });

    // Sync GoTrue password
    const { error: updPwdErr } = await svc.auth.admin.updateUserById(userId, { password: derivedPassword });
    if (updPwdErr) return NextResponse.json({ error: 'Failed to sync auth password' }, { status: 500 });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}