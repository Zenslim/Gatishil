// app/api/pin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

// CORS preflight
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// Guard accidental GETs
export function GET() {
  return new NextResponse('Use POST for this endpoint', { status: 405 });
}

function normalizePhone(input: string): string {
  const raw = input.trim();
  if (raw.startsWith('+')) return raw;         // already E.164
  // strip non-digits
  const digits = raw.replace(/\D/g, '');
  // Nepali mobiles are typically 10 digits and often written 0XXXXXXXXX.
  // If starts with 0 and next two are 97/98/96/95, convert to +977…
  if (/^0(97|98|96|95)\d{7}$/.test(digits)) {
    return '+977' + digits.slice(1);
  }
  // If already looks like 97/98/96/95 + 8 digits (no 0), add +977
  if (/^(97|98|96|95)\d{8}$/.test(digits)) {
    return '+977' + digits;
  }
  // Fallback: return with plus if it’s all digits
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

    if (method === 'phone') {
      userInput = normalizePhone(userInput);
    } else {
      userInput = userInput.trim().toLowerCase();
    }

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) return new NextResponse('Server missing PIN_PEPPER', { status: 500 });

    const admin = getSupabaseAdmin();

    // Resolve the auth user id + identities
    let authUserId: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    if (method === 'email') {
      // Primary: auth admin by email
      const { data: list, error } = await admin.auth.admin.listUsers({ email: userInput, perPage: 1 });
      if (error) return new NextResponse(`Lookup failed: ${error.message}`, { status: 500 });
      const hit = (list?.users || []).find(u => u.email?.toLowerCase() === userInput);
      if (hit?.id) {
        authUserId = hit.id; email = hit.email ?? null; phone = hit.phone ?? null;
      } else {
        // Fallback: profiles by email
        const { data: prof, error: pe } = await admin.from('profiles').select('user_id, email').eq('email', userInput).maybeSingle();
        if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });
        if (prof?.user_id) {
          authUserId = prof.user_id;
          const { data: byId, error: ge } = await admin.auth.admin.getUserById(authUserId);
          if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
          email = byId.user?.email ?? null;
          phone = byId.user?.phone ?? null;
        }
      }
    } else {
      // method === 'phone' — profiles first (most projects store phone there)
      const { data: prof, error: pe } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .or(`phone.eq.${userInput},phone.eq.${userInput.replace('+977','0')}`)
        .maybeSingle();
      if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });

      if (prof?.user_id) {
        authUserId = prof.user_id;
        // Try to hydrate identities from auth
        const { data: byId, error: ge } = await admin.auth.admin.getUserById(authUserId);
        if (!ge && byId?.user) {
          email = byId.user.email ?? prof.email ?? null;
          phone = byId.user.phone ?? prof.phone ?? userInput;
        } else {
          email = prof.email ?? null;
          phone = prof.phone ?? userInput;
        }
      } else {
        // Fallback: try auth admin list by phone (supported in newer SDKs)
        const { data: list, error } = await admin.auth.admin.listUsers({ phone: userInput, perPage: 1 } as any);
        if (error) return new NextResponse(`Phone lookup failed: ${error.message}`, { status: 500 });
        const hit = (list?.users || []).find(u => u.phone === userInput || u.phone === userInput.replace('+977','0'));
        if (hit?.id) {
          authUserId = hit.id; email = hit.email ?? null; phone = hit.phone ?? userInput;
        }
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

    // Use whichever identity exists (email preferred; phone fallback)
    let signInError: any = null;
    if (method === 'email' && email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else if (phone) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derivedB64u } as any);
      signInError = error;
    } else if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else {
      return new NextResponse('No usable identity for this account', { status: 400 });
    }

    if (signInError) return new NextResponse(signInError.message, { status: 401 });

    return response; // cookies attached
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
