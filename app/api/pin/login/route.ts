import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

/** Feature flag for Trust PIN gate */
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** Env needed */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PIN_PEPPER = process.env.PIN_PEPPER!;

/** Helpers */
const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const e164 = (raw: string) => {
  const s = raw.trim();
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '');
  // Nepal-only policy: +977 + 10 digits (mobile usually starts 97/98/96)
  if (digits.startsWith('977')) return `+${digits}`;
  return `+977${digits}`;
};

const derivePinPassword = (pin: string, userId: string, saltB64url: string, pepper: string) => {
  // salt is stored in base64url; convert back to std base64 then to Buffer
  const saltStd = saltB64url.replace(/-/g, '+').replace(/_/g, '/');
  const salt = Buffer.from(saltStd, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  // Parameters must match /api/pin/set exactly
  const dk = crypto.scryptSync(material, salt, 32, { N: 8192, r: 8, p: 1 }) as Buffer;
  return b64url(dk);
};

/** CORS / method guards */
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
export function GET() {
  return new NextResponse('Use POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });
    if (!SUPABASE_URL || !SUPABASE_ANON || !PIN_PEPPER) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { email: rawEmail, phone: rawPhone, pin } = (await req.json().catch(() => ({}))) as {
      email?: string;
      phone?: string;
      pin?: string;
    };

    // Validate inputs: exactly one of email | phone, and a PIN
    const email = (rawEmail ?? '').trim() || undefined;
    const phone = rawPhone ? e164(rawPhone) : undefined;
    if (!pin || (!email && !phone) || (email && phone)) {
      return NextResponse.json(
        { error: 'Provide exactly one of {email|phone} and a pin' },
        { status: 400 }
      );
    }

    // Bind SSR client to response cookies
    const cookieStore = cookies();
    const supabaseSSR = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (setCookies) => {
          for (const { name, value, options } of setCookies) cookieStore.set(name, value, options);
        },
      },
    });

    // 1) Resolve user via public.profiles (id == auth.users.id)
    const whereCol = email ? 'email' : 'phone';
    const whereVal = (email ?? phone)!;
    const { data: profile, error: profErr } = await supabaseSSR
      .from('profiles')
      .select('id, email, phone')
      .eq(whereCol, whereVal)
      .maybeSingle();

    if (profErr) return NextResponse.json({ error: 'DB error resolving user' }, { status: 500 });
    if (!profile?.id) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId: string = profile.id;

    // 2) Load PIN salt (must exist and be non-null)
    const { data: pinRow, error: pinErr } = await supabaseSSR
      .from('auth_local_pin')
      .select('salt')
      .eq('user_id', userId)
      .maybeSingle();

    if (pinErr) return NextResponse.json({ error: 'DB error reading PIN' }, { status: 500 });
    if (!pinRow?.salt) {
      // Legacy/buggy records from earlier null-salt write show up here
      return NextResponse.json({ error: 'No PIN set for this account' }, { status: 409 });
    }

    // 3) Derive the password exactly like we did in /api/pin/set
    const derivedPassword = derivePinPassword(pin, userId, pinRow.salt, PIN_PEPPER);

    // 4) Always sign in with the auth user’s PRIMARY EMAIL
    //    (phone users often have a synthetic email in GoTrue; admin fetch is source of truth)
    const admin = getSupabaseAdmin();
    const { data: user, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !user?.user?.email) {
      // Fallback to profile.email only if admin email is missing
      if (!profile.email) return NextResponse.json({ error: 'Account email missing' }, { status: 500 });
    }
    const authEmail = (user?.user?.email ?? profile.email) as string;

    // 5) Server-side sign in (this writes secure HTTP-only cookies to the response)
    const { error: signInErr } = await supabaseSSR.auth.signInWithPassword({
      email: authEmail,
      password: derivedPassword,
    });

    if (signInErr) {
      // If this hits, it almost always means /api/pin/set never synced the derived password into GoTrue
      return NextResponse.json({ error: 'Invalid PIN for this account' }, { status: 401 });
    }

    // 6) Done: cookies are set. Client should redirect on 204.
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
