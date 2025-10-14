// Next.js 14 App Router — WebAuthn Registration Options (self-authenticating)
export const runtime = 'nodejs';

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

import { setChallengeCookie, deriveRpID, expectedOrigins, rpName } from '@/lib/webauthn';
import { generateRegistrationOptions } from '@simplewebauthn/server';

function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

function readAccessToken(): string | null {
  const jar = cookies();
  const h = headers();
  const sb = jar.get('sb-access-token')?.value;
  if (sb) return sb;
  const legacy = jar.get('supabase-auth-token')?.value;
  if (legacy) {
    try { const parsed = JSON.parse(legacy); if (parsed?.access_token) return parsed.access_token as string; } catch {}
  }
  const auth = h.get('authorization') || h.get('Authorization');
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }
  return null;
}

function decodeJWT(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const [, p2] = token.split('.');
    if (!p2) return null;
    const json = Buffer.from(p2, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

export async function POST() {
  try {
    const host = headers().get('host');
    const rpID = deriveRpID(host);

    const token = readAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const claims = decodeJWT(token);
    const userId = claims?.sub;
    const email = claims?.email ?? null;
    const exp = claims?.exp ?? null;
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (exp && exp * 1000 < Date.now()) return NextResponse.json({ ok: false, error: 'Session expired' }, { status: 401 });

    const supabase = supabaseServer();

    const { data: existing } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    const excludeCredentials = (existing ?? []).map((c: any) => ({
      id: c.credential_id,
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: rpName ?? 'Gatishil Nepal',
      rpID,
      userID: userId,
      userName: email ?? userId,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'preferred',
      },
      timeout: 60000,
      excludeCredentials,
    });

    const res = NextResponse.json({ ok: true, options, expectedOrigins: Array.from(expectedOrigins) });
    setChallengeCookie(res, options.challenge);
    return res;
  } catch (err: any) {
    console.error('[webauthn/options] error', err);
    return NextResponse.json({ ok: false, error: 'Failed to create options', detail: String(err?.message || err) }, { status: 500 });
  }
}