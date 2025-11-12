// app/api/pin/set/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs'; // Node crypto + SSR cookie adapter

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PIN_PEPPER = process.env.PIN_PEPPER;

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
    const supabaseSSR = getSupabaseServer({ request: req, response: res });

    // Must be signed in to set a PIN
    const { data: me, error: meErr } = await supabaseSSR.auth.getUser();
    if (meErr || !me?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = me.user.id;
    const currentEmail = me.user.email ?? null;
    // Supabase JS user doesn't include phone reliably; fetch from profiles if needed
    let currentPhone: string | null = null;

    // Generate 16-byte salt; prepare both encodings
    const saltBytes = randomBytes(16);
    const saltB64 = saltBytes.toString('base64');
    const saltPgBytea = '\\x' + saltBytes.toString('hex'); // bytea format for Postgres

    // Derive password exactly like /api/pin/login
    const { derivedB64u } = derivePasswordFromPinSync({
      pin: pinStr,
      userId,
      saltB64,
      pepper: PIN_PEPPER!,
    });

    const admin = getSupabaseAdmin();

    // Try to get phone from profiles for re-login fallback
    const { data: prof } = await admin
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();
    currentPhone = (prof?.phone as string | undefined) ?? null;

    // Write BOTH columns so legacy NOT NULL(salt) is satisfied
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert(
        {
          user_id: userId,
          salt_b64: saltB64, // human-friendly
          salt: saltPgBytea, // bytea, satisfies NOT NULL "salt"
        },
        { onConflict: 'user_id' },
      );
    if (upsertErr) {
      return NextResponse.json({ error: 'Failed to save PIN salt' }, { status: 500 });
    }

    // Sync derived PIN-password into GoTrue
    const { error: adminErr } = await admin.auth.admin.updateUserById(userId, {
      password: derivedB64u,
    });
    if (adminErr) {
      return NextResponse.json({ error: 'Failed to sync password' }, { status: 500 });
    }

    // IMPORTANT: Updating password can invalidate the current session.
    // Re-authenticate server-side now so cookies are fresh and the client can go to /dashboard.
    // Prefer email if present; otherwise try phone (password login supports both).
    let relogErr: any = null;
    if (currentEmail) {
      const r = await supabaseSSR.auth.signInWithPassword({
        email: currentEmail,
        password: derivedB64u,
      });
      relogErr = r.error;
    } else if (currentPhone) {
      // Ensure E.164 form: +977…
      const normalizePhone = (raw: string) => {
        const t = (raw ?? '').trim();
        if (!t) return '';
        if (t.startsWith('+')) return t;
        const d = t.replace(/\D/g, '');
        if (d.startsWith('977')) return `+${d}`;
        return `+977${d}`;
      };
      const phone = normalizePhone(currentPhone);
      const r = await supabaseSSR.auth.signInWithPassword({
        phone,
        password: derivedB64u,
      });
      relogErr = r.error;
    }

    if (relogErr) {
      // Even if re-login fails, return 204 and let UI handle a follow-up login;
      // but in practice this should succeed and preserve the session.
      // Uncomment the next line to surface the message during debugging:
      // return NextResponse.json({ error: `Re-login failed: ${relogErr.message}` }, { status: 500 });
    }

    // Success → client should redirect to /dashboard on 204
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
