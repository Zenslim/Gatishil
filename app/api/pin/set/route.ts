import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { genSalt, derivePasswordFromPin } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** Build an SSR Supabase client bound to request/response cookies. */
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

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN feature disabled', { status: 404 });

    // Prepare response up-front so the SSR client can write cookies into it.
    const res = new NextResponse(null, { status: 200 });
    const supabaseSSR = getSSRClient(req, res);

    // 1) Must have a valid (OTP-created) session
    const { data: { user } } = await supabaseSSR.auth.getUser();
    if (!user) return new NextResponse('No session', { status: 401 });

    // 2) Validate PIN
    const { pin } = await req.json().catch(() => ({ pin: '' }));
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
      return new NextResponse('Invalid PIN format', { status: 400 });
    }

    // 3) Server config
    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) {
      return new NextResponse('Server not configured (PIN_PEPPER)', { status: 500 });
    }

    // 4) Derive strong password
    const salt = genSalt(16);
    const { derivedB64u } = await derivePasswordFromPin({
      pin,
      userId: user.id,
      salt,
      pepper,
      length: 48,
    });

    // 5) Upsert PIN KDF metadata & update auth password (this invalidates current session)
    const admin = getSupabaseAdmin();

    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert({
        user_id: user.id,
        salt: salt.toString('base64'),
        kdf: 'scrypt-v1(N=8192,r=8,p=1)',
        pin_retries: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);
    if (upsertErr) return new NextResponse(`DB upsert failed: ${upsertErr.message}`, { status: 500 });

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: derivedB64u });
    if (updErr) return new NextResponse(`Auth update failed: ${updErr.message}`, { status: 500 });

    // 6) RE-AUTH to mint a fresh session (critical to prevent redirect to /login)
    //    Need an email identity to sign in with password.
    const { data: getUserById, error: fetchErr } = await admin.auth.admin.getUserById(user.id);
    if (fetchErr) return new NextResponse(`Auth lookup failed: ${fetchErr.message}`, { status: 500 });
    const email = getUserById.user?.email;
    if (!email) return new NextResponse('No email identity for this account', { status: 400 });

    const { error: signinErr } = await supabaseSSR.auth.signInWithPassword({
      email,
      password: derivedB64u,
    });
    if (signinErr) return new NextResponse(`Post-update sign-in failed: ${signinErr.message}`, { status: 500 });

    // 7) Success: cookies for the NEW session have been written into `res`
    return res; // do NOT return a fresh NextResponse.json; keep the cookies we just set
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
