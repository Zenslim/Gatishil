import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { genSalt, derivePasswordFromPin } from '@/lib/crypto/pin';

// Feature flag (same one you set in Vercel)
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** Build an SSR Supabase client bound to the incoming request & outgoing response cookies. */
function getSSRClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          // write into the response so middleware sees updated cookies if Supabase rotates anything
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) {
      return new NextResponse('Trust PIN feature disabled', { status: 404 });
    }

    // Prepare an outgoing response up front (needed for SSR client cookie binding)
    const res = new NextResponse(null, { status: 200 });

    const supabase = getSSRClient(req, res);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new NextResponse('No session', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pin: string = String(body?.pin || '');

    if (!/^\d{4,8}$/.test(pin)) {
      return new NextResponse('Invalid PIN format', { status: 400 });
    }

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) {
      return new NextResponse('Server not configured (PIN_PEPPER)', { status: 500 });
    }

    // Derive a strong Supabase password from PIN + user_id + salt + PEPPER
    const salt = genSalt(16);
    const { derivedB64u } = derivePasswordFromPin({
      pin,
      userId: user.id,
      salt,
      pepper,
      length: 48,
    });

    // Upsert PIN KDF metadata and update auth password via service-role client
    const admin = getSupabaseAdmin();

    // NOTE: auth_local_pin.salt is BYTEA. Supabase/PostgREST accepts base64 for bytea.
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert({
        user_id: user.id,
        salt: salt.toString('base64'),
        kdf: 'scrypt-v1',
        pin_retries: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);

    if (upsertErr) {
      return new NextResponse(`DB upsert failed: ${upsertErr.message}`, { status: 500 });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: derivedB64u,
    });
    if (updErr) {
      return new NextResponse(`Auth update failed: ${updErr.message}`, { status: 500 });
    }

    // Success — we didn’t rotate cookies; existing OTP session remains valid
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
