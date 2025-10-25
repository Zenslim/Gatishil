
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { genSalt, derivePasswordFromPin } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

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

export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST for this endpoint', { status: 405 }); }

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN feature disabled', { status: 404 });

    const res = new NextResponse(null, { status: 200 });
    const supabaseSSR = getSSRClient(req, res);

    // Must have OTP-created session
    const { data: { user } } = await supabaseSSR.auth.getUser();
    if (!user) return new NextResponse('No session', { status: 401 });

    // Parse body
    let pin = '';
    try {
      const body = await req.json();
      pin = String(body?.pin || '');
    } catch { return new NextResponse('Invalid body', { status: 400 }); }
    if (!/^\d{4,8}$/.test(pin)) return new NextResponse('Invalid PIN format', { status: 400 });

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) return new NextResponse('Server not configured (PIN_PEPPER)', { status: 500 });

    // Derive strong secret from PIN
    const salt = genSalt(16);
    const salt_b64 = salt.toString('base64');
    const { derivedB64u } = await derivePasswordFromPin({
      pin,
      userId: user.id,
      salt,
      pepper,
      length: 48,
    });

    const admin = getSupabaseAdmin();

    // 1) Upsert salt/KDF metadata (TEXT salt_b64; no BYTEA write)
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert({
        user_id: user.id,
        salt_b64,
        kdf: 'scrypt-v1(N=8192,r=8,p=1)',
        pin_retries: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);
    if (upsertErr) return new NextResponse(`DB upsert failed: ${upsertErr.message}`, { status: 500 });

    // 2) Update Supabase password via service role
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: derivedB64u });
    if (updErr) return new NextResponse(`Auth update failed: ${updErr.message}`, { status: 500 });

    // 3) VERIFY the write: sign out and sign back in with the new secret
    await supabaseSSR.auth.signOut();

    const { data: userRecord, error: fetchErr } = await admin.auth.admin.getUserById(user.id);
    if (fetchErr) return new NextResponse(`Auth lookup failed: ${fetchErr.message}`, { status: 500 });

    const email = userRecord.user?.email ?? null;
    const phone = userRecord.user?.phone ?? null;
    if (!email && !phone) return new NextResponse('No email or phone identity for this account', { status: 400 });

    let verifyErr: any = null;
    if (email) {
      const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derivedB64u });
      verifyErr = error;
    } else {
      const { error } = await supabaseSSR.auth.signInWithPassword({ phone: phone!, password: derivedB64u } as any);
      verifyErr = error;
    }
    if (verifyErr) return new NextResponse(`PIN write verification failed: ${verifyErr.message}`, { status: 500 });

    const { data: { session } } = await supabaseSSR.auth.getSession();
    if (!session?.access_token || !session?.refresh_token) {
      return new NextResponse('No session returned after re-sign-in', { status: 500 });
    }

    return NextResponse.json({ ok: true }, { headers: res.headers });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
