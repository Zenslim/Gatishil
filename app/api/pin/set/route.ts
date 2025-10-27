// app/api/pin/set/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs'; // use Node crypto + SSR cookie adapter

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PIN_PEPPER = process.env.PIN_PEPPER;

const getSupabaseSSR = (req: NextRequest, res: NextResponse) =>
  createServerClient(SUPABASE_URL!, SUPABASE_ANON!, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

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

    const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
    const pinStr = String(pin ?? '').trim();
    if (!pinStr || !/^\d{4,8}$/.test(pinStr)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    // Bind SSR client to request/response cookies
    const res = new NextResponse(null, { status: 204 });
    const supabaseSSR = getSupabaseSSR(req, res);

    // Must be signed in to set a PIN
    const { data: userData, error: userErr } = await supabaseSSR.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    // Generate 16-byte salt; prepare both encodings
    const saltBytes = randomBytes(16);
    const saltB64 = saltBytes.toString('base64');
    const saltPgBytea = '\\x' + saltBytes.toString('hex'); // PostgREST bytea format

    // Derive password exactly like /api/pin/login
    const { derivedB64u } = derivePasswordFromPinSync({
      pin: pinStr,
      userId,
      saltB64,
      pepper: PIN_PEPPER!,
    });

    const admin = getSupabaseAdmin();

    // Write BOTH columns so legacy NOT NULL(salt) is satisfied
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert(
        {
          user_id: userId,
          salt_b64: saltB64,   // human-friendly
          salt: saltPgBytea,   // bytea, satisfies NOT NULL "salt"
        },
        { onConflict: 'user_id' },
      );

    if (upsertErr) {
      // Uncomment to see exact DB error during debugging:
      // return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      return NextResponse.json({ error: 'Failed to save PIN salt' }, { status: 500 });
    }

    // Sync derived PIN-password into GoTrue
    const { error: adminErr } = await admin.auth.admin.updateUserById(userId, {
      password: derivedB64u,
    });
    if (adminErr) {
      return NextResponse.json({ error: 'Failed to sync password' }, { status: 500 });
    }

    // Success → client redirects on 204
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
