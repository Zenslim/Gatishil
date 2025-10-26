import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const DEBUG_PIN = process.env.NEXT_PUBLIC_DEBUG_PIN === 'true'; // <<< turn ON to see DB error details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PIN_PEPPER = process.env.PIN_PEPPER!;

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const toE164NP = (raw?: string) => {
  if (!raw) return undefined;
  let s = String(raw).trim().replace(/[()\s-]/g, '');
  if (!s) return undefined;
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('977')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 10) return `+977${digits.slice(1)}`;
  if (digits.length >= 9) return `+977${digits}`;
  return `+977${digits}`;
};

const derivePinPassword = (pin: string, userId: string, saltB64url: string, pepper: string) => {
  const saltStd = saltB64url.replace(/-/g, '+').replace(/_/g, '/');
  const salt = Buffer.from(saltStd, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const dk = crypto.scryptSync(material, salt, 32, { N: 8192, r: 8, p: 1 }) as Buffer;
  return b64url(dk);
};

async function readBodyAny(req: NextRequest): Promise<any> {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) { try { return await req.json(); } catch {} }
  if (ct.includes('multipart/form-data')) {
    try {
      const fd = await req.formData(); const o: any = {};
      for (const [k, v] of fd.entries()) o[k] = typeof v === 'string' ? v : '';
      return o;
    } catch {}
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    try {
      const txt = await req.text(); const p = new URLSearchParams(txt); const o: any = {};
      p.forEach((v, k) => (o[k] = v)); return o;
    } catch {}
  }
  try {
    const txt = await req.text(); if (!txt) return {};
    try { return JSON.parse(txt); } catch {
      const p = new URLSearchParams(txt); const o: any = {}; p.forEach((v,k)=>o[k]=v); return o;
    }
  } catch { return {}; }
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}
function extract(raw: any): { email?: string; phone?: string; pin?: string } {
  const bags = [raw, raw?.values, raw?.data, raw?.form, raw?.form?.values, raw?.payload, raw?.input, raw?.body].filter(Boolean);
  let email, phone, pin;
  for (const b of bags) {
    const ident = pick(b, ['identifier','login','user','username']);
    const em = pick(b, ['email','userEmail','mail']);
    const ph = pick(b, ['phone','phone_e164','mobile','msisdn','number','contact']);
    const pn = pick(b, ['pin','pincode','pin_code','code','otp','password','passcode']);
    if (!email && (em || (ident && ident.includes('@')))) email = (em || ident)!.toLowerCase();
    if (!phone && (ph || (ident && !ident.includes('@')))) phone = toE164NP(ph || ident);
    if (!pin && pn && /^\d{4,8}$/.test(pn)) pin = pn;
  }
  return { email, phone, pin };
}

export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST', { status: 405 }); }

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE_ROLE_KEY || !PIN_PEPPER)
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const raw = await readBodyAny(req);
    const { email, phone, pin } = extract(raw);

    const provided = [!!email, !!phone].filter(Boolean).length;
    if (!pin && provided === 0) return new NextResponse(null, { status: 204 });
    if (!pin || provided !== 1)
      return NextResponse.json({ error: 'Provide exactly one of {email|phone} and a pin' }, { status: 400 });

    const cookieStore = cookies();
    const supabaseSSR = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (setCookies) => { for (const { name, value, options } of setCookies) cookieStore.set(name, value, options); },
      },
    });

    // 1) Resolve user via RPC (schema-qualified)
    const { data: resolved, error: resolveErr } = await supabaseSSR.rpc('public.resolve_user_for_pin', {
      p_email: email ?? null,
      p_phone: phone ?? null,
    });

    if (resolveErr) {
      if (DEBUG_PIN) {
        return NextResponse.json({ error: 'DB error resolving user', message: resolveErr.message, details: (resolveErr as any).details ?? null, hint: (resolveErr as any).hint ?? null }, { status: 500 });
      }
      return NextResponse.json({ error: 'DB error resolving user' }, { status: 500 });
    }
    if (!resolved?.user_id) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userId: string = resolved.user_id;
    const accountEmail: string | null = resolved.email;

    // 2) Get PIN salt via RPC
    const { data: pinInfo, error: pinErr } = await supabaseSSR.rpc('public.get_pin_salt', { p_user_id: userId });
    if (pinErr) {
      if (DEBUG_PIN) {
        return NextResponse.json({ error: 'DB error reading PIN', message: pinErr.message, details: (pinErr as any).details ?? null, hint: (pinErr as any).hint ?? null }, { status: 500 });
      }
      return NextResponse.json({ error: 'DB error reading PIN' }, { status: 500 });
    }
    if (!pinInfo?.salt) return NextResponse.json({ error: 'No PIN set for this account' }, { status: 409 });

    const derivedPassword = derivePinPassword(pin, userId, pinInfo.salt, PIN_PEPPER);

    // 3) Canonical auth email via Admin (fallback to profile email)
    const admin = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: adminUser, error: adminGetErr } = await admin.auth.admin.getUserById(userId);
    if (adminGetErr && DEBUG_PIN) console.error('admin.getUserById failed', adminGetErr);
    const authEmail = adminUser?.user?.email || accountEmail;
    if (!authEmail) return NextResponse.json({ error: 'Account email missing' }, { status: 500 });

    // 4) Server-side sign-in (sets cookies)
    const { error: signInErr } = await supabaseSSR.auth.signInWithPassword({
      email: authEmail,
      password: derivedPassword,
    });
    if (signInErr) {
      if (DEBUG_PIN) {
        return NextResponse.json({ error: 'Invalid PIN for this account', message: signInErr.message }, { status: 401 });
      }
      return NextResponse.json({ error: 'Invalid PIN for this account' }, { status: 401 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (DEBUG_PIN) {
      return NextResponse.json({ error: 'Unexpected error', message: e?.message ?? null, stack: e?.stack ?? null }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
