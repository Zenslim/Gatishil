import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/** Feature flag */
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** Required env */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PIN_PEPPER = process.env.PIN_PEPPER!;

/** Helpers */
const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const toE164NP = (raw: string) => {
  if (!raw) return undefined;
  let s = raw.trim();
  // Remove spaces, hyphens, parentheses
  s = s.replace(/[()\s-]/g, '');
  // Already E.164?
  if (s.startsWith('+')) return s;
  // Strip non-digits
  const digits = s.replace(/\D/g, '');
  // Handle common Nepal phone variants: 98xxxxxxxx, 97xxxxxxxx, 96xxxxxxxx, 0xxxxxxxxx
  if (digits.startsWith('977')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `+977${digits.slice(1)}`;
  if (digits.length >= 9) return `+977${digits}`;
  return `+977${digits}`; // best-effort
};

const derivePinPassword = (pin: string, userId: string, saltB64url: string, pepper: string) => {
  const saltStd = saltB64url.replace(/-/g, '+').replace(/_/g, '/');
  const salt = Buffer.from(saltStd, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const dk = crypto.scryptSync(material, salt, 32, { N: 8192, r: 8, p: 1 }) as Buffer;
  return b64url(dk);
};

async function readBody(req: NextRequest): Promise<{ email?: string; phone?: string; identifier?: string; pin?: string }> {
  const ct = req.headers.get('content-type') || '';
  // 1) JSON
  if (ct.includes('application/json')) {
    try {
      return (await req.json()) as any;
    } catch { /* fallthrough */ }
  }
  // 2) FormData (multipart or urlencoded)
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    try {
      const fd = await req.formData();
      const obj: any = {};
      for (const [k, v] of fd.entries()) obj[k] = typeof v === 'string' ? v : '';
      return obj;
    } catch { /* fallthrough */ }
  }
  // 3) Last-ditch: try to parse as URLSearchParams
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    if ([...params.keys()].length) {
      const obj: any = {};
      params.forEach((v, k) => (obj[k] = v));
      return obj;
    }
  } catch { /* ignore */ }
  return {};
}

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
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const body = await readBody(req);

    // Accept identifier OR email/phone
    let email = (body.email ?? '').trim() || undefined;
    let phone = (body.phone ?? '').trim() || undefined;
    const identifier = (body.identifier ?? '').trim() || undefined;
    const pin = (body.pin ?? '').trim() || undefined;

    if (identifier && !email && !phone) {
      if (identifier.includes('@')) email = identifier.toLowerCase();
      else phone = identifier;
    }
    if (email) email = email.toLowerCase();
    if (phone) phone = toE164NP(phone);

    // Validate
    const provided = [!!email, !!phone].filter(Boolean).length;
    if (!pin || provided !== 1) {
      return NextResponse.json({ error: 'Provide exactly one of {email|phone} and a pin' }, { status: 400 });
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

    // Resolve user via public.profiles with robust fallback
    // Try by email or by multiple phone columns
    let profile: { id: string; email: string | null; phone: string | null } | null = null;

    if (email) {
      const { data, error } = await supabaseSSR
        .from('profiles')
        .select('id, email, phone')
        .eq('email', email)
        .maybeSingle();
      if (error) return NextResponse.json({ error: 'DB error resolving user' }, { status: 500 });
      profile = data ?? null;
    } else if (phone) {
      // Try 'phone' exact
      let resp = await supabaseSSR
        .from('profiles')
        .select('id, email, phone')
        .eq('phone', phone)
        .maybeSingle();

      // If not found, try 'phone_e164'
      if (!resp.data) {
        resp = await supabaseSSR
          .from('profiles')
          .select('id, email, phone')
          .eq('phone_e164', phone)
          .maybeSingle();
      }

      // Final attempt: try a loose OR on common variants
      if (!resp.data) {
        const digits = phone.replace(/\D/g, '');
        const zeroLead = digits.startsWith('977') ? `0${digits.slice(3)}` : `0${digits}`;
        const local = digits.startsWith('977') ? digits.slice(3) : digits;

        const { data, error } = await supabaseSSR
          .from('profiles')
          .select('id, email, phone')
          .or(
            [
              `phone.eq.${phone}`,
              `phone.eq.${zeroLead}`,
              `phone.eq.${local}`,
              `phone_e164.eq.${phone}`,
            ].join(',')
          )
          .maybeSingle();

        if (error) return NextResponse.json({ error: 'DB error resolving user' }, { status: 500 });
        resp = { data, error: null } as any;
      }

      profile = resp.data ?? null;
    }

    if (!profile?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = profile.id;

    // Load PIN salt
    const { data: pinRow, error: pinErr } = await supabaseSSR
      .from('auth_local_pin')
      .select('salt')
      .eq('user_id', userId)
      .maybeSingle();

    if (pinErr) return NextResponse.json({ error: 'DB error reading PIN' }, { status: 500 });
    if (!pinRow?.salt) return NextResponse.json({ error: 'No PIN set for this account' }, { status: 409 });

    const derivedPassword = derivePinPassword(pin, userId, pinRow.salt, PIN_PEPPER);

    // Fetch the canonical auth email via Admin (source of truth for signInWithPassword)
    const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: adminUser, error: adminErr } = await admin.auth.admin.getUserById(userId);
    if (adminErr) return NextResponse.json({ error: 'Failed to read account' }, { status: 500 });

    const authEmail = adminUser?.user?.email || profile.email;
    if (!authEmail) return NextResponse.json({ error: 'Account email missing' }, { status: 500 });

    // Server-side sign-in (writes secure HTTP-only cookies on this response)
    const { error: signInErr } = await supabaseSSR.auth.signInWithPassword({
      email: authEmail,
      password: derivedPassword,
    });

    if (signInErr) {
      // Most often: /api/pin/set never synced the derived password into GoTrue
      return NextResponse.json({ error: 'Invalid PIN for this account' }, { status: 401 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
