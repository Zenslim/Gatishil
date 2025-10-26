import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient, PostgrestError } from '@supabase/supabase-js';
import crypto from 'crypto';

/** Flags */
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';
const DEBUG_PIN = process.env.NEXT_PUBLIC_DEBUG_PIN === 'true';

/** Env */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PIN_PEPPER = process.env.PIN_PEPPER || '';

/* ---------- helpers ---------- */
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
    try { const fd = await req.formData(); const o: any = {}; for (const [k, v] of fd.entries()) o[k] = typeof v === 'string' ? v : ''; return o; } catch {}
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    try { const txt = await req.text(); const p = new URLSearchParams(txt); const o: any = {}; p.forEach((v,k)=>o[k]=v); return o; } catch {}
  }
  try {
    const txt = await req.text(); if (!txt) return {};
    try { return JSON.parse(txt); } catch {
      const p = new URLSearchParams(txt); const o: any = {}; p.forEach((v,k)=>o[k]=v); return o;
    }
  } catch { return {}; }
}

function pickFirst(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}
function extractFields(raw: any): { email?: string; phone?: string; pin?: string } {
  const bags = [raw, raw?.values, raw?.data, raw?.form, raw?.form?.values, raw?.payload, raw?.input, raw?.body].filter(Boolean);
  let email: string|undefined, phone: string|undefined, pin: string|undefined;
  for (const b of bags) {
    const identifier = pickFirst(b, ['identifier','login','user','username']);
    const maybeEmail = pickFirst(b, ['email','userEmail','mail']);
    const maybePhone = pickFirst(b, ['phone','mobile','msisdn','number','contact']); // no phone_e164
    const maybePin   = pickFirst(b, ['pin','pincode','pin_code','code','otp','password','passcode']);
    if (!email && (maybeEmail || (identifier && identifier.includes('@')))) email = (maybeEmail || identifier)!.toLowerCase();
    if (!phone && (maybePhone || (identifier && !identifier.includes('@')))) phone = toE164NP(maybePhone || identifier);
    if (!pin && maybePin && /^\d{4,8}$/.test(maybePin)) pin = maybePin;
  }
  return { email, phone, pin };
}

function jerr(code: number, msg: string, debug?: any) {
  if (DEBUG_PIN && debug) return NextResponse.json({ error: msg, debug }, { status: code });
  return NextResponse.json({ error: msg }, { status: code });
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

    // tolerant parse
    const raw = await readBodyAny(req);
    const { email, phone, pin } = extractFields(raw);
    const provided = [!!email, !!phone].filter(Boolean).length;

    // ignore empty mount calls
    if (!pin && provided === 0) return new NextResponse(null, { status: 204 });
    if (!pin || provided !== 1) return jerr(400, 'Provide exactly one of {email|phone} and a pin');

    // SSR client → to set cookies after sign-in
    const cookieStore = cookies();
    const supabaseSSR = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (setCookies) => { for (const { name, value, options } of setCookies) cookieStore.set(name, value, options); },
      },
    });

    // Service Role for public.* table reads (bypass RLS)
    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // -------- resolve user_id from public.profiles only (no phone_e164) --------
    let userId: string | null = null;

    if (email) {
      const q = await svc.from('profiles').select('id').eq('email', email).maybeSingle();
      if (q.error) {
        const e = q.error as PostgrestError;
        return jerr(500, 'DB error resolving user', { phase: 'profiles_lookup_email', code: e.code, message: e.message, details: e.details, hint: e.hint });
      }
      userId = q.data?.id ?? null;
    } else {
      const e164 = toE164NP(phone!)!;
      // Try exact phone match then local variants
      let resp = await svc.from('profiles').select('id').eq('phone', e164).maybeSingle();
      if (resp.error) {
        const e = resp.error as PostgrestError;
        return jerr(500, 'DB error resolving user', { phase: 'profiles_lookup_phone_exact', code: e.code, message: e.message, details: e.details, hint: e.hint });
      }
      if (!resp.data) {
        const digits = e164.replace(/\D/g, '');
        const zeroLead = digits.startsWith('977') ? `0${digits.slice(3)}` : `0${digits}`;
        const local = digits.startsWith('977') ? digits.slice(3) : digits;
        const loose = await svc
          .from('profiles')
          .select('id')
          .or([`phone.eq.${e164}`, `phone.eq.${zeroLead}`, `phone.eq.${local}`].join(','))
          .maybeSingle();
        if (loose.error) {
          const e = loose.error as PostgrestError;
          return jerr(500, 'DB error resolving user', { phase: 'profiles_lookup_phone_loose', code: e.code, message: e.message, details: e.details, hint: e.hint });
        }
        resp = { data: loose.data, error: null } as any;
      }
      userId = resp.data?.id ?? null;
    }

    if (!userId) return jerr(404, 'User not found');

    // -------- read PIN salt from public.auth_local_pin --------
    const pinQ = await svc.from('auth_local_pin').select('salt').eq('user_id', userId).maybeSingle();
    if (pinQ.error) {
      const e = pinQ.error as PostgrestError;
      return jerr(500, 'DB error reading PIN', { phase: 'read_pin_salt', code: e.code, message: e.message, details: e.details, hint: e.hint });
    }
    if (!pinQ.data?.salt) return jerr(409, 'No PIN set for this account');

    // -------- fetch canonical email via Admin API (GoTrue), not PostgREST --------
    const admin = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: adminUser, error: adminErr } = await admin.auth.admin.getUserById(userId);
    if (adminErr) {
      return jerr(500, 'Failed to read account', { phase: 'admin_get_user', message: adminErr.message });
    }
    const authEmail = adminUser?.user?.email || null;
    if (!authEmail) return jerr(500, 'Account email missing'); // PIN signin uses email+password on GoTrue

    // derive + server-side sign-in (stamps cookies)
    const derivedPassword = derivePinPassword(pin, userId, pinQ.data.salt, PIN_PEPPER);
    const signIn = await supabaseSSR.auth.signInWithPassword({ email: authEmail, password: derivedPassword });
    if (signIn.error) {
      return jerr(401, 'Invalid PIN for this account', { phase: 'sign_in', message: signIn.error.message });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return jerr(500, 'Unexpected error', { message: e?.message, stack: e?.stack });
  }
}
