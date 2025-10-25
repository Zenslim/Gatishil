import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

// Preflight + guard
export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST for this endpoint', { status: 405 }); }

function normalizePhone(input: string): string {
  const raw = input.trim();
  if (raw.startsWith('+')) return raw; // already E.164
  const digits = raw.replace(/\D/g, '');
  // Nepali typical mobile shapes
  if (/^0(97|98|96|95)\d{7}$/.test(digits)) return '+977' + digits.slice(1);
  if (/^(97|98|96|95)\d{8}$/.test(digits)) return '+977' + digits;
  // fallback: prefix plus
  return '+' + digits;
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });

    const body = await req.json().catch(() => ({}));
    const method = String(body?.method || '');
    let userInput = String(body?.user || '');
    const pin = String(body?.pin || '');

    if (!/^\d{4,8}$/.test(pin)) return new NextResponse('Invalid PIN', { status: 400 });
    if (method !== 'email' && method !== 'phone') return new NextResponse('Invalid method', { status: 400 });
    if (!userInput) return new NextResponse('Missing user', { status: 400 });

    // normalize input
    if (method === 'phone') userInput = normalizePhone(userInput);
    else userInput = userInput.trim().toLowerCase();

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) return new NextResponse('Server missing PIN_PEPPER', { status: 500 });

    const admin = getSupabaseAdmin();

    // -------- 1) Resolve user_id from profiles (single source of truth) --------
    let userId: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    if (method === 'email') {
      const { data: prof, error: pe } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .eq('email', userInput)
        .maybeSingle();
      if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });
      if (prof?.user_id) {
        userId = prof.user_id;
        email = prof.email ?? null;
        phone = prof.phone ?? null;
      }
    } else {
      const zeroForm = userInput.replace('+977', '0');
      const { data: prof, error: pp } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .or(`phone.eq.${userInput},phone.eq.${zeroForm}`)
        .maybeSingle();
      if (pp) return new NextResponse(`Profile lookup failed: ${pp.message}`, { status: 500 });
      if (prof?.user_id) {
        userId = prof.user_id;
        email = prof.email ?? null;
        phone = prof.phone ?? userInput;
      }
    }

    // Fallbacks only if profiles didn’t find it
    if (!userId && method === 'email') {
      const { data: list, error } = await admin.auth.admin.listUsers({ email: userInput, perPage: 1 });
      if (error) return new NextResponse(`Auth lookup failed: ${error.message}`, { status: 500 });
      const u = (list?.users || []).find(x => x.email?.toLowerCase() === userInput);
      if (u?.id) {
        userId = u.id; email = u.email ?? null; phone = u.phone ?? null;
      }
    } else if (!userId && method === 'phone') {
      // As a last resort, try profiles LIKE (handles saved formats)
      const { data: profs, error: plike } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .ilike('phone', `%${userInput.slice(-8)}%`);
      if (plike) return new NextResponse(`Profile lookup failed: ${plike.message}`, { status: 500 });
      const hit = (profs || [])[0];
      if (hit?.user_id) {
        userId = hit.user_id; email = hit.email ?? null; phone = hit.phone ?? userInput;
      }
    }

    if (!userId) return new NextResponse('User not found', { status: 404 });

    // -------- 2) Hydrate identities from Auth (by user_id) --------
    const { data: byId, error: ge } = await admin.auth.admin.getUserById(userId);
    if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
    email = byId.user?.email ?? email ?? null;
    phone = byId.user?.phone ?? phone ?? null;

    // -------- 3) Read saved salt and derive same password --------
    const { data: pinMeta, error: mErr } = await admin
      .from('auth_local_pin')
      .select('salt')
      .eq('user_id', userId)
      .maybeSingle();
    if (mErr) return new NextResponse(`PIN meta read failed: ${mErr.message}`, { status: 500 });
    if (!pinMeta?.salt) return new NextResponse('PIN not set for account', { status: 400 });

    const { derivedB64u } = derivePasswordFromPinSync({
      pin,
      userId,
      saltB64: pinMeta.salt as string,
      pepper,
      length: 48,
    });

    // -------- 4) Server-side sign-in; write cookies into response --------
    const jar = cookies();
    const response = new NextResponse(null, { status: 200 });
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => jar.get(name)?.value,
          set: (name: string, value: string, options: any) => response.cookies.set({ name, value, ...options }),
          remove: (name: string, options: any) => response.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    // Prefer the same method used by the user; fall back to whichever identity exists
    let signInError: any = null;
    if (method === 'email' && email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else if (method === 'phone' && phone) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derivedB64u } as any);
      signInError = error;
    } else if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else if (phone) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derivedB64u } as any);
      signInError = error;
    } else {
      return new NextResponse('No usable identity for this account', { status: 400 });
    }

    if (signInError) return new NextResponse('Invalid PIN for this account', { status: 401 });

    return response; // cookies attached
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
