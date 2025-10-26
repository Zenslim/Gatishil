import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const PIN_PEPPER = process.env.PIN_PEPPER || '';
const ADMIN_SECRET = process.env.ADMIN_TASK_SECRET || '';

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
      'Cache-Control': 'no-store',
    },
  });
}
function noContent() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
      'Cache-Control': 'no-store',
    },
  });
}

export function OPTIONS() { return json({ ok: true }); }
export function GET() {
  return json({
    ok: true,
    route: '/api/admin/set-pin-for-user',
    env: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON: !!SUPABASE_ANON,
      PIN_PEPPER: !!PIN_PEPPER,
      ADMIN_TASK_SECRET: ADMIN_SECRET ? 'set' : 'not_set',
    },
  });
}

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER || !SUPABASE_ANON) {
      return json(
        { error: 'Server misconfigured', details: {
          SUPABASE_URL: !!SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
          SUPABASE_ANON: !!SUPABASE_ANON,
          PIN_PEPPER: !!PIN_PEPPER,
        }},
        500
      );
    }
    if (ADMIN_SECRET) {
      const hdr = req.headers.get('x-admin-secret') || '';
      if (hdr !== ADMIN_SECRET) return json({ error: 'Forbidden' }, 403);
    }

    const { userId, pin } = (await req.json().catch(() => ({}))) as { userId?: string; pin?: string };
    if (!userId || !pin || !/^\d{4,8}$/.test(String(pin))) {
      return json({ error: 'Provide userId and 4–8 digit pin' }, 400);
    }

    // Service Role for admin ops
    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // 1) Ensure canonical email on GoTrue
    const { data: u, error: userErr } = await svc.auth.admin.getUserById(userId);
    if (userErr) return json({ error: 'User read failed', message: userErr.message }, 500);

    let email = u?.user?.email || '';
    if (!email) {
      const synthetic = `${userId}@gn.local`;
      const { error: updEmailErr } = await svc.auth.admin.updateUserById(userId, { email: synthetic });
      if (updEmailErr) return json({ error: 'Failed to assign canonical email', message: updEmailErr.message }, 500);
      email = synthetic;
      await svc.from('profiles').upsert({ id: userId, email: synthetic }, { onConflict: 'id' });
    }

    // 2) Upsert salt + update GoTrue password
    const salt = b64url((crypto as any).randomBytes(16));
    const derivedPassword = derive(pin, userId, salt, PIN_PEPPER);

    const up = await svc.from('auth_local_pin').upsert({ user_id: userId, salt }, { onConflict: 'user_id' });
    if (up.error) return json({ error: 'Failed to store PIN', message: up.error.message }, 500);

    const upd = await svc.auth.admin.updateUserById(userId, { password: derivedPassword });
    if (upd.error) return json({ error: 'Failed to sync auth password', message: upd.error.message }, 500);

    // 3) SELF-VERIFY against the SAME project (catches env/email mismatches immediately)
    const anon = createServiceClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
    const signIn = await anon.auth.signInWithPassword({ email, password: derivedPassword });
    if (signIn.error) {
      return json({
        error: 'Post-set sign-in failed',
        details: {
          email_used: email,
          message: signIn.error.message,
          hint: 'This usually means NEXT_PUBLIC_SUPABASE_URL/ANON or PIN_PEPPER differ from what your login route uses.',
        },
      }, 500);
    }

    return noContent();
  } catch (e: any) {
    return json({ error: e?.message || 'Unexpected error' }, 500);
  }
}
