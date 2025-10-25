import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

/** base64url */
function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Derive password from PIN + userId + salt + PEPPER (scrypt, memory-safe). */
function derivePasswordFromPin(pin: string, userId: string, saltB64: string, pepper: string, len = 48): string {
  const salt = Buffer.from(saltB64, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  // N=8192 (~8MiB) r=8 p=1 — safe on serverless
  const out = crypto.scryptSync(material, salt, len, { N: 1 << 13, r: 8, p: 1 }) as Buffer;
  return b64u(out);
}

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });

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

    // Resolve auth user and identity
    let authUserId: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    if (method === 'email') {
      const { data: list, error } = await admin.auth.admin.listUsers({ email: userInput, perPage: 1 });
      if (error) return new NextResponse(`Lookup failed: ${error.message}`, { status: 500 });
      const u = (list?.users || []).find(x => x.email?.toLowerCase() === userInput.toLowerCase());
      if (!u?.id) return new NextResponse('User not found', { status: 404 });
      authUserId = u.id; email = u.email ?? null; phone = u.phone ?? null;
    } else {
      // method === 'phone' — find by phone in auth, with profile fallback if you need it
      const { data: list, error } = await admin.auth.admin.listUsers({ phone: userInput, perPage: 1 } as any);
      if (error) return new NextResponse(`Phone lookup failed: ${error.message}`, { status: 500 });
      const u = (list?.users || []).find(x => x.phone === userInput);
      if (!u?.id) {
        // Fallback via profiles table if your project maps phone there:
        const { data: prof, error: pe } = await admin.from('profiles').select('user_id').eq('phone', userInput).maybeSingle();
        if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });
        if (!prof?.user_id) return new NextResponse('User not found', { status: 404 });
        authUserId = prof.user_id;
        const { data: byId, error: ge } = await admin.auth.admin.getUserById(authUserId);
        if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
        email = byId.user?.email ?? null;
        phone = byId.user?.phone ?? null;
      } else {
        authUserId = u.id; email = u.email ?? null; phone = u.phone ?? null;
      }
    }

    if (!authUserId) return new NextResponse('User not found', { status: 404 });

    // Read salt
    const { data: pinMeta, error: mErr } = await admin
      .from('auth_local_pin')
      .select('salt')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (mErr) return new NextResponse(`PIN meta read failed: ${mErr.message}`, { status: 500 });
    if (!pinMeta?.salt) return new NextResponse('PIN not set for account', { status: 400 });

    const derivedPassword = derivePasswordFromPin(pin, authUserId, pinMeta.salt as string, pepper);

    // Server-side sign-in and write cookies in the response
    const cookieStore = cookies();
    const response = new NextResponse(null, { status: 200 });
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => response.cookies.set({ name, value, ...options }),
          remove: (name: string, options: any) => response.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    // Use whichever identity exists
    let signInError: any = null;
    if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedPassword });
      signInError = error;
    } else if (phone) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derivedPassword } as any);
      signInError = error;
    } else {
      return new NextResponse('No email or phone identity for this account', { status: 400 });
    }
    if (signInError) return new NextResponse(signInError.message, { status: 401 });

    return response; // cookies attached
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
