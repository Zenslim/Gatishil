
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST for this endpoint', { status: 405 }); }

function normalizePhone(input: string): string {
  const raw = input.trim();
  if (raw.startsWith('+')) return raw; // E.164
  const digits = raw.replace(/\D/g, '');
  if (/^0(97|98|96|95)\d{7}$/.test(digits)) return '+977' + digits.slice(1);
  if (/^(97|98|96|95)\d{8}$/.test(digits)) return '+977' + digits;
  return '+' + digits;
}
function b64u(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function clampKdf(kdf?: string) {
  const safe = { N: 1 << 13, r: 8, p: 1 }; // 8192,8,1
  if (!kdf) return safe;
  const m = /N=(\d+),r=(\d+),p=(\d+)/.exec(kdf);
  if (!m) return safe;
  let N = parseInt(m[1], 10);
  let r = parseInt(m[2], 10);
  let p = parseInt(m[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return safe;
  if (N > (1 << 13)) N = 1 << 13;
  if (r > 8) r = 8;
  if (p > 1) p = 1;
  return { N, r, p };
}
function deriveSafe(pin: string, userId: string, saltB64: string, pepper: string, N: number, r: number, p: number, len = 48) {
  const salt = Buffer.from(saltB64, 'base64'); // NB: we now store/read TEXT base64
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const out = crypto.scryptSync(material, salt, len, { N, r, p }) as Buffer;
  return b64u(out);
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) return new NextResponse('Trust PIN disabled', { status: 404 });

    const body = await req.json().catch(() => ({}));
    const method = String(body?.method || '');
    let userInput = String(body?.user || '');
    const pin = String(body?.pin || '');

    if (!/^\d{4,8}$/.test(pin)) return new NextResponse('Invalid PIN', { status: 400 });
    if (method !== 'email' && method !== 'phone') return new NextResponse('Invalid method', { status: 400 });
    if (!userInput) return new NextResponse('Missing user', { status: 400 });

    if (method === 'phone') userInput = normalizePhone(userInput);
    else userInput = userInput.trim().toLowerCase();

    const primaryPepper = process.env.PIN_PEPPER || '';
    const prevPepper = process.env.PIN_PEPPER_PREV || '';
    if (primaryPepper.length < 16) return new NextResponse('Server missing PIN_PEPPER', { status: 500 });
    const peppers = prevPepper && prevPepper !== primaryPepper ? [primaryPepper, prevPepper] : [primaryPepper];

    const admin = getSupabaseAdmin();

    // Resolve user_id via profiles
    let userId: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    if (method === 'email') {
      const { data: prof, error: pe } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .eq('email', userInput)
        .maybeSingle();
      if (pe) return new NextResponse(`Profile lookup failed: ${pe.message}`, { status: 500 });
      if (prof?.user_id) { userId = prof.user_id; email = prof.email ?? null; phone = prof.phone ?? null; }
    } else {
      const zeroForm = userInput.replace('+977', '0');
      const { data: prof, error: pp } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .or(`phone.eq.${userInput},phone.eq.${zeroForm}`)
        .maybeSingle();
      if (pp) return new NextResponse(`Profile lookup failed: ${pp.message}`, { status: 500 });
      if (prof?.user_id) { userId = prof.user_id; email = prof.email ?? null; phone = prof.phone ?? userInput; }
    }

    if (!userId) return new NextResponse('User not found', { status: 404 });

    const { data: byId, error: ge } = await admin.auth.admin.getUserById(userId);
    if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
    email = byId.user?.email ?? email ?? null;
    phone = byId.user?.phone ?? phone ?? null;

    // Read TEXT base64 salt + kdf
    const { data: pinMeta, error: mErr } = await admin
      .from('auth_local_pin')
      .select('salt_b64,kdf')
      .eq('user_id', userId)
      .maybeSingle();
    if (mErr) return new NextResponse(`PIN meta read failed: ${mErr.message}`, { status: 500 });
    const salt_b64 = (pinMeta as any)?.salt_b64 as string | null;
    if (!salt_b64) return new NextResponse('PIN not set for account', { status: 400 });

    const { N, r, p } = clampKdf((pinMeta as any)?.kdf as string | undefined);

    // Try peppers
    const jar = cookies();
    const response = new NextResponse(null, { status: 200 });
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => jar.get(name)?.value,
          set: (name: string, value: string, options: any) => response.cookies.set({ name, value, ...options }),
          remove: (name: string, options: any) => response.cookies.set({ name, value: '', ...options }),
        },
      }
    );

    let success = false;
    for (const pepper of peppers) {
      let derived: string | null = null;
      try {
        derived = deriveSafe(pin, userId, salt_b64, pepper, N, r, p, 48);
      } catch {
        continue; // skip bad params
      }

      if (method === 'email' && email && !success) {
        const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derived });
        success = !error;
      }
      if (method === 'phone' && phone && !success) {
        const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derived } as any);
        success = !error;
      }
      if (email && !success) {
        const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derived });
        success = !error;
      }
      if (phone && !success) {
        const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derived } as any);
        success = !error;
      }

      if (success) break;
    }

    if (!success) return new NextResponse('Invalid PIN for this account', { status: 401 });
    return response;
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
