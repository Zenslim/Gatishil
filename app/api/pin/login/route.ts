
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

// Handle OPTIONS for safety
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// Friendly message for accidental GETs
export function GET() {
  return new NextResponse('Use POST for this endpoint', { status: 405 });
}

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

    // Resolve auth user by email or phone (with profile fallback for phone)
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
      const { data: list, error } = await admin.auth.admin.listUsers({ phone: userInput, perPage: 1 } as any);
      if (error) return new NextResponse(`Phone lookup failed: ${error.message}`, { status: 500 });
      const u = (list?.users || []).find(x => x.phone === userInput);
      if (u?.id) {
        authUserId = u.id; email = u.email ?? null; phone = u.phone ?? null;
      } else {
        const { data: prof, error: pe } = await admin.from('profiles').select('user_id').eq('phone', userInput).maybeSingle();
        if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });
        if (!prof?.user_id) return new NextResponse('User not found', { status: 404 });
        authUserId = prof.user_id;
        const { data: byId, error: ge } = await admin.auth.admin.getUserById(authUserId);
        if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
        email = byId.user?.email ?? null;
        phone = byId.user?.phone ?? null;
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

    // Derive same Supabase password
    const { derivedB64u } = derivePasswordFromPinSync({
      pin,
      userId: authUserId,
      saltB64: pinMeta.salt as string,
      pepper,
      length: 48,
    });

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

    let signInError: any = null;
    if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else if (phone) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derivedB64u } as any);
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
