import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PIN_PEPPER = process.env.PIN_PEPPER;

const normalizePhone = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('977')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `+977${digits.slice(1)}`;
  if (digits.length >= 9) return `+977${digits}`;
  return `+977${digits}`;
};

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

/* ---------- handlers ---------- */
export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST', { status: 405 }); }

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
      return jerr(500, 'Server misconfigured', {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_ANON: !!SUPABASE_ANON,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
        PIN_PEPPER: !!PIN_PEPPER,
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      phone?: string;
      pin?: string;
    };

    const emailInput = body.email?.trim() || '';
    const phoneInput = body.phone?.trim() || '';
    const pin = String(body.pin ?? '').trim();

    if (!pin || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    const hasEmail = !!emailInput;
    const hasPhone = !!phoneInput;
    if (!hasEmail && !hasPhone) {
      return NextResponse.json({ error: 'Missing email or phone' }, { status: 400 });
    }
    if (hasEmail && hasPhone) {
      return NextResponse.json({ error: 'Provide either email or phone, not both' }, { status: 400 });
    }

    const identifierColumn = hasEmail ? 'email' : 'phone';
    const identifierValue = hasEmail ? emailInput : normalizePhone(phoneInput);

    if (!identifierValue) {
      return NextResponse.json({ error: 'Invalid identifier' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, email, phone')
      .eq(identifierColumn, identifierValue)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: 'Failed to lookup account' }, { status: 500 });
    }
    if (!profile?.id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const userId = profile.id as string;

    const { data: pinRow, error: pinErr } = await admin
      .from('auth_local_pin')
      .select('salt, salt_b64')
      .eq('user_id', userId)
      .maybeSingle();

    if (pinErr) {
      return NextResponse.json({ error: 'Failed to read PIN' }, { status: 500 });
    }

    let saltValue = (pinRow?.salt_b64 || pinRow?.salt || '') as string;
    if (!saltValue) {
      return NextResponse.json({ error: 'No PIN set for this account' }, { status: 409 });
    }

    if (saltValue.startsWith('\\x')) {
      saltValue = Buffer.from(saltValue.slice(2), 'hex').toString('base64');
    }

    const saltB64 = saltValue.replace(/-/g, '+').replace(/_/g, '/');

    const { derivedB64u: derivedPassword } = derivePasswordFromPinSync({
      pin,
      userId,
      saltB64,
      pepper: PIN_PEPPER,
    });

    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId);
    if (authErr) {
      return NextResponse.json({ error: 'Failed to load account identity' }, { status: 500 });
    }

    const authEmail = authUser.user?.email ?? profile.email;
    if (!authEmail) {
      return NextResponse.json({ error: 'Account email missing' }, { status: 500 });
    }

    const res = new NextResponse(null, { status: 204 });
    const supabaseSSR = getSupabaseSSR(req, res);

    const { error: signInErr } = await supabaseSSR.auth.signInWithPassword({
      email: authEmail,
      password: derivedPassword,
    });

    if (signInErr) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return res;
  } catch (e: any) {
    return jerr(500, 'Unexpected error', { message: e?.message, stack: e?.stack });
  }
}