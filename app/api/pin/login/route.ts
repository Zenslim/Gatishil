import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

// Preflight + guard
export function OPTIONS() { return new NextResponse(null, { status: 204 }); }
export function GET() { return new NextResponse('Use POST for this endpoint', { status: 405 }); }

// ---- helpers ----
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
function parseKdf(kdf?: string) {
  // examples: "scrypt-v1", "scrypt-v1(N=8192,r=8,p=1)"
  const m = kdf ? /N=(\d+),r=(\d+),p=(\d+)/.exec(kdf) : null;
  if (!m) return null;
  return { N: parseInt(m[1], 10), r: parseInt(m[2], 10), p: parseInt(m[3], 10) };
}
function derive(pin: string, userId: string, saltB64: string, pepper: string, N: number, r: number, p: number, len = 48) {
  const salt = Buffer.from(saltB64, 'base64');
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

    // normalize input
    if (method === 'phone') userInput = normalizePhone(userInput);
    else userInput = userInput.trim().toLowerCase();

    // peppers (support rotation without breaking existing PINs)
    const primaryPepper = process.env.PIN_PEPPER || '';
    const prevPepper = process.env.PIN_PEPPER_PREV || '';
    if (primaryPepper.length < 16) return new NextResponse('Server missing PIN_PEPPER', { status: 500 });
    const peppers = prevPepper && prevPepper !== primaryPepper ? [primaryPepper, prevPepper] : [primaryPepper];

    const admin = getSupabaseAdmin();

    // ---- 1) Resolve user_id from profiles (single source of truth) ----
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
      if (prof?.user_id) {
        userId = prof.user_id; email = prof.email ?? null; phone = prof.phone ?? null;
      }
    } else {
      const zeroForm = userInput.replace('+977', '0');
      const { data: prof, error: pp } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .or(`phone.eq.${userInput},phone.eq.${zeroForm}`)
        .maybeSingle();
      if (pp) return new NextResponse(`Profile lookup failed: ${pp.message}`, { status: 500 });
      if (prof?.user_id) {
        userId = prof.user_id; email = prof.email ?? null; phone = prof.phone ?? userInput;
      }
    }

    // Last-resort fallbacks if profiles didn’t find it
    if (!userId && method === 'email') {
      const { data: list, error } = await admin.auth.admin.listUsers({ email: userInput, perPage: 1 });
      if (error) return new NextResponse(`Auth lookup failed: ${error.message}`, { status: 500 });
      const u = (list?.users || []).find(x => x.email?.toLowerCase() === userInput);
      if (u?.id) { userId = u.id; email = u.email ?? null; phone = u.phone ?? null; }
    } else if (!userId && method === 'phone') {
      const { data: profs, error: plike } = await admin
        .from('profiles')
        .select('user_id, email, phone')
        .ilike('phone', `%${userInput.slice(-8)}%`);
      if (plike) return new NextResponse(`Profile lookup failed: ${plike.message}`, { status: 500 });
      const hit = (profs || [])[0];
      if (hit?.user_id) { userId = hit.user_id; email = hit.email ?? null; phone = hit.phone ?? userInput; }
    }

    if (!userId) return new NextResponse('User not found', { status: 404 });

    // ---- 2) Hydrate identities from Auth (by user_id) ----
    const { data: byId, error: ge } = await admin.auth.admin.getUserById(userId);
    if (ge) return new NextResponse(`Auth lookup failed: ${ge.message}`, { status: 500 });
    email = byId.user?.email ?? email ?? null;
    phone = byId.user?.phone ?? phone ?? null;

    // ---- 3) Read salt + kdf (if present) ----
    const { data: pinMeta, error: mErr } = await admin
      .from('auth_local_pin')
      .select('salt,kdf')
      .eq('user_id', userId)
      .maybeSingle();
    if (mErr) return new NextResponse(`PIN meta read failed: ${mErr.message}`, { status: 500 });
    if (!pinMeta?.salt) return new NextResponse('PIN not set for account', { status: 400 });

    // Build KDF candidates: exact from row (if any) then common ones
    const candidates: Array<{N:number;r:number;p:number}> = [];
    const fromRow = parseKdf(pinMeta.kdf as string | undefined);
    if (fromRow) candidates.push(fromRow);
    // Add common scrypt costs we may have used earlier
    const seen = new Set<string>(fromRow ? [`${fromRow.N}-${fromRow.r}-${fromRow.p}`] : []);
    const push = (N:number,r:number,p:number)=>{ const k=`${N}-${r}-${p}`; if(!seen.has(k)){ candidates.push({N,r,p}); seen.add(k);} };
    push(1<<13,8,1);  // 8192
    push(1<<14,8,1);  // 16384
    push(1<<15,8,1);  // 32768

    // ---- 4) Try all (pepper x kdf) combos until one signs in ----
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
    outer: for (const pepper of peppers) {
      for (const {N,r,p} of candidates) {
        const derived = derive(pin, userId, pinMeta.salt as string, pepper, N, r, p, 48);

        // Prefer the same method used by the user; fall back to whichever exists
        let err: any = null;
        if (method === 'email' && email && !success) {
          const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derived });
          err = error; success = !error;
        }
        if (method === 'phone' && phone && !success) {
          const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derived } as any);
          err = error; success = !error;
        }
        if (email && !success) {
          const { error } = await supabaseSSR.auth.signInWithPassword({ email, password: derived });
          err = error; success = !error;
        }
        if (phone && !success) {
          const { error } = await supabaseSSR.auth.signInWithPassword({ phone, password: derived } as any);
          err = error; success = !error;
        }
        if (success) break outer;
      }
    }

    if (!success) return new NextResponse('Invalid PIN for this account', { status: 401 });

    return response; // cookies attached
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
