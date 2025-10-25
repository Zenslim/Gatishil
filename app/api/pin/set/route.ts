
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { genSalt, derivePasswordFromPin } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** SSR client bound to request/response cookies (so we can write cookies back). */
function getSSRClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
}

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
    if (!ENABLED) return new NextResponse('Trust PIN feature disabled', { status: 404 });

    // Prepare response up-front so cookies get written into it.
    const res = new NextResponse(null, { status: 200 });
    const supabaseSSR = getSSRClient(req, res);

    // 1) Must have a valid (OTP-created) session
    const { data: { user } } = await supabaseSSR.auth.getUser();
    if (!user) return new NextResponse('No session', { status: 401 });

    // 2) Validate input
    let pin = '';
    try {
      const body = await req.json();
      pin = String(body?.pin || '');
    } catch {
      return new NextResponse('Invalid body', { status: 400 });
    }
    if (!/^\d{4,8}$/.test(pin)) {
      return new NextResponse('Invalid PIN format', { status: 400 });
    }

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) {
      return new NextResponse('Server not configured (PIN_PEPPER)', { status: 500 });
    }

    // 3) Derive new strong password from PIN (scrypt, memory-safe params)
    const salt = genSalt(16);
    const { derivedB64u } = await derivePasswordFromPin({
      pin,
      userId: user.id,
      salt,
      pepper,
      length: 48,
    });

    // 4) Upsert PIN meta + update auth password (this invalidates the current session)
    const admin = getSupabaseAdmin();
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert({
        user_id: user.id,
        salt: salt.toString('base64'),            // BYTEA via base64
        kdf: 'scrypt-v1(N=8192,r=8,p=1)',
        pin_retries: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);
    if (upsertErr) return new NextResponse(`DB upsert failed: ${upsertErr.message}`, { status: 500 });

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: derivedB64u });
    if (updErr) return new NextResponse(`Auth update failed: ${updErr.message}`, { status: 500 });

    // 5) RE-AUTH using whichever identity exists (email OR phone) and write cookies
    const { data: userRecord, error: fetchErr } = await admin.auth.admin.getUserById(user.id);
    if (fetchErr) return new NextResponse(`Auth lookup failed: ${fetchErr.message}`, { status: 500 });

    const email = userRecord.user?.email ?? null;
    const phone = userRecord.user?.phone ?? null;
    if (!email && !phone) {
      return new NextResponse('No email or phone identity for this account', { status: 400 });
    }

    let signInError: any = null;
    if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      signInError = error;
    } else {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone: phone!, password: derivedB64u } as any);
      signInError = error;
    }
    if (signInError) return new NextResponse(`Post-update sign-in failed: ${signInError.message}`, { status: 500 });

    // Ensure cookies definitely exist
    const { data: { session } } = await supabaseSSR.auth.getSession();
    if (!session?.access_token || !session?.refresh_token) {
      return new NextResponse('No session returned after sign-in', { status: 500 });
    }

    // 6) Return JSON from the SAME response so cookie headers are preserved
    return NextResponse.json({ ok: true }, { headers: res.headers });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
