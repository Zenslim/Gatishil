import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const ENABLE_TRUST_PIN = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** base64url */
function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Derive password from PIN + userId + salt + PEPPER (scrypt) */
function derivePasswordFromPin(pin: string, userId: string, saltB64: string, pepper: string, len = 48): string {
  const salt = Buffer.from(saltB64, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const out = crypto.scryptSync(material, salt, len, { N: 1 << 15, r: 8, p: 1 }) as Buffer;
  return b64u(out);
}

/**
 * POST /api/pin/login
 * Body: { user: string, method: 'email'|'phone', pin: string }
 * - Resolves the auth user by email or phone (via admin if needed).
 * - Reads salt from public.auth_local_pin (admin).
 * - Derives the same Supabase password and performs server-side signInWithPassword.
 * - Writes Supabase cookies to the response (no client setSession, no double-rotation).
 */
export async function POST(req: NextRequest) {
  try {
    if (!ENABLE_TRUST_PIN) return new NextResponse('Trust PIN disabled', { status: 404 });

    const body = await req.json().catch(() => ({}));
    const method = String(body?.method || '');
    const userInput = String(body?.user || '');
    const pin = String(body?.pin || '');

    if (!/^\d{4,8}$/.test(pin)) return new NextResponse('Invalid PIN', { status: 400 });
    if (method !== 'email' && method !== 'phone') return new NextResponse('Invalid method', { status: 400 });
    if (!userInput) return new NextResponse('Missing user', { status: 400 });

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) return new NextResponse('Server missing PIN_PEPPER', { status: 500 });

    const admin = getSupabaseAdmin();

    // Resolve auth user by email or phone
    let authUserId: string | null = null;
    let emailForAuth: string | null = null;

    if (method === 'email') {
      // Get user by email (admin)
      const { data: usersByEmail, error: ue } = await admin.auth.admin.listUsers({ email: userInput, perPage: 1 });
      if (ue) return new NextResponse(`Lookup failed: ${ue.message}`, { status: 500 });
      const hit = (usersByEmail?.users || []).find(u => u.email?.toLowerCase() === userInput.toLowerCase());
      if (!hit?.id || !hit.email) return new NextResponse('User not found', { status: 404 });
      authUserId = hit.id;
      emailForAuth = hit.email;
    } else {
      // method === 'phone'
      // Try to find a profile row with this phone. Adjust table/column names to your schema if different.
      const { data: profile, error: pe } = await admin
        .from('profiles')
        .select('user_id, email')
        .eq('phone', userInput)
        .maybeSingle();
      if (pe) return new NextResponse(`Phone lookup failed: ${pe.message}`, { status: 500 });
      if (!profile?.user_id) return new NextResponse('User not found', { status: 404 });
      authUserId = profile.user_id;
      // If your auth uses email identities, fetch email from auth admin
      if (!profile.email) {
        const { data: userById, error: ui } = await admin.auth.admin.getUserById(authUserId);
        if (ui) return new NextResponse(`Auth lookup failed: ${ui.message}`, { status: 500 });
        emailForAuth = userById.user?.email ?? null;
      } else {
        emailForAuth = profile.email;
      }
      if (!emailForAuth) return new NextResponse('No email identity for this account', { status: 400 });
    }

    // Pull the stored salt from auth_local_pin (admin read)
    const { data: pinMeta, error: pmErr } = await admin
      .from('auth_local_pin')
      .select('salt')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (pmErr) return new NextResponse(`PIN meta read failed: ${pmErr.message}`, { status: 500 });
    if (!pinMeta?.salt) return new NextResponse('PIN not set for account', { status: 400 });

    const derivedPassword = derivePasswordFromPin(pin, authUserId!, pinMeta.salt as string, pepper);

    // Create a server-bound Supabase client that can set cookies on the response
    const cookieStore = cookies();
    const response = new NextResponse(null, { status: 200 });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailForAuth!,
      password: derivedPassword,
    });
    if (error) return new NextResponse(error.message, { status: 401 });

    // Success: cookies already written into `response` by the Supabase SSR client
    return response;
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
