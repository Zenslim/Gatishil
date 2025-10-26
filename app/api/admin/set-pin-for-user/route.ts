import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Admin-only: set PIN for an arbitrary userId.
 * Body: { userId: string, pin: string }
 * - Ensures canonical email if missing: {userId}@gn.local
 * - Upserts non-null salt into public.auth_local_pin
 * - Derives password = scrypt(pin:userId:PIN_PEPPER)
 * - Updates GoTrue password via Service Role
 *
 * Protect this route behind your own admin check (e.g., IP allowlist or a secret header).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PIN_PEPPER = process.env.PIN_PEPPER!;
const ADMIN_SECRET = process.env.ADMIN_TASK_SECRET; // optional: require header x-admin-secret

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (ADMIN_SECRET) {
      const hdr = req.headers.get('x-admin-secret');
      if (hdr !== ADMIN_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, pin } = (await req.json().catch(() => ({}))) as { userId?: string; pin?: string };
    if (!userId || !pin || !/^\d{4,8}$/.test(String(pin))) {
      return NextResponse.json({ error: 'Provide userId and 4–8 digit pin' }, { status: 400 });
    }

    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Ensure canonical email exists in GoTrue
    const { data: u } = await svc.auth.admin.getUserById(userId);
    let email = u?.user?.email || '';
    if (!email) {
      const synthetic = `${userId}@gn.local`;
      const { error: updEmailErr } = await svc.auth.admin.updateUserById(userId, { email: synthetic });
      if (updEmailErr) return NextResponse.json({ error: 'Failed to assign canonical email' }, { status: 500 });
      email = synthetic;
      // reflect into public.profiles for convenience
      await svc.from('profiles').upsert({ id: userId, email: synthetic }, { onConflict: 'id' });
    }

    // Create salt + derive
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