// app/api/pin/set/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs'; // stable Node crypto + SSR cookie adapter

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PIN_PEPPER = process.env.PIN_PEPPER;

const getSupabaseSSR = (req: NextRequest, res: NextResponse) =>
  createServerClient(SUPABASE_URL!, SUPABASE_ANON!, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        // ensure any auth cookie writes (rare on this route) still attach to the response
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

    // Bind SSR client to request/response cookies (no "this.context.cookies" anywhere)
    const res = new NextResponse(null, { status: 204 });
    const supabaseSSR = getSupabaseSSR(req, res);

    // Require an authenticated user to set a PIN
    const { data: userData, error: userErr } = await supabaseSSR.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    // Generate a new 16-byte salt (base64) — single source of truth is our table
    const saltB64 = randomBytes(16).toString('base64');

    // Deterministically derive the GoTrue password from PIN + userId + pepper + salt
    const { derivedB64u } = derivePasswordFromPinSync({
      pin: pinStr,
      userId,
      saltB64,
      pepper: PIN_PEPPER!,
    });

    const admin = getSupabaseAdmin();

    // Upsert salt metadata (store as base64 to avoid bytea vs text mismatches)
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert(
        { user_id: userId, salt_b64: saltB64 },
        { onConflict: 'user_id' },
      );
    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save PIN salt' }, { status: 500 });
    }

    // Sync the derived password into GoTrue so password login matches our derivation
    const { error: adminErr } = await admin.auth.admin.updateUserById(userId, {
      password: derivedB64u,
    });
    if (adminErr) {
      return NextResponse.json({ error: 'Failed to sync password' }, { status: 500 });
    }

    // Success: client should hard-redirect on 204
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
