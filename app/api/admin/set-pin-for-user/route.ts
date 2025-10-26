import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PIN_PEPPER = process.env.PIN_PEPPER || '';
const ADMIN_SECRET = process.env.ADMIN_TASK_SECRET || ''; // optional; require via header

function cors(json: any, status = 200) {
  return new NextResponse(JSON.stringify(json), {
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

export function OPTIONS() {
  // CORS preflight
  return cors({ ok: true });
}

// Simple health probe to confirm the route is live & env is present
export function GET() {
  return cors({
    ok: true,
    route: '/api/admin/set-pin-for-user',
    env: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
      return cors({ error: 'Server misconfigured', details: {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
        PIN_PEPPER: !!PIN_PEPPER,
      }}, 500);
    }

    if (ADMIN_SECRET) {
      const hdr = req.headers.get('x-admin-secret') || '';
      if (hdr !== ADMIN_SECRET) return cors({ error: 'Forbidden' }, 403);
    }

    const { userId, pin } = (await req.json().catch(() => ({}))) as { userId?: string; pin?: string };
    if (!userId || !pin || !/^\d{4,8}$/.test(String(pin))) {
      return cors({ error: 'Provide userId and 4–8 digit pin' }, 400);
    }

    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Ensure canonical email exists
    const { data: u, error: userErr } = await svc.auth.admin.getUserById(userId);
    if (userErr) return cors({ error: 'User read failed', message: userErr.message }, 500);

    let email = u?.user?.email || '';
    if (!email) {
      const synthetic = `${userId}@gn.local`;
      const { error: updEmailErr } = await svc.auth.admin.updateUserById(userId, { email: synthetic });
      if (updEmailErr) return cors({ error: 'Failed to assign canonical email', message: updEmailErr.message }, 500);
      email = synthetic;
      // mirror into public.profiles (ignore errors)
      await svc.from('profiles').upsert({ id: userId, email: synthetic }, { onConflict: 'id' });
    }

    // Make salt + derive
    const salt = b64url((crypto as any).randomBytes(16));
    const derivedPassword = derive(pin, userId, salt, PIN_PEPPER);

    // Upsert salt
    const up = await svc.from('auth_local_pin').upsert({ user_id: userId, salt }, { onConflict: 'user_id' });
    if (up.error) return cors({ error: 'Failed to store PIN', message: up.error.message }, 500);

    // Sync GoTrue password
    const upd = await svc.auth.admin.updateUserById(userId, { password: derivedPassword });
    if (upd.error) return cors({ error: 'Failed to sync auth password', message: upd.error.message }, 500);

    return cors({ ok: true }, 204);
  } catch (e: any) {
    return cors({ error: e?.message || 'Unexpected error' }, 500);
  }
}
