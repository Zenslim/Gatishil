// Next.js 14 App Router — WebAuthn Registration Verify (self-authenticating)
export const runtime = 'nodejs';

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

import {
  deriveRpID,
  expectedOrigins,
  readChallengeCookie,
  clearChallengeCookie,
  extractRegistrationCredential,
  toBase64Url,
} from '@/lib/webauthn';

import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

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

export async function POST(req: Request) {
  try {
    const host = headers().get('host');
    const cookieHeader = headers().get('cookie');
    const rpID = deriveRpID(host);
    const origins = Array.from(expectedOrigins);

    const token = readAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const claims = decodeJWT(token);
    const userId = claims?.sub;
    const exp = claims?.exp ?? null;
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (exp && exp * 1000 < Date.now()) return NextResponse.json({ ok: false, error: 'Session expired' }, { status: 401 });

    const payload = await req.json();
    const credential: RegistrationResponseJSON | null = extractRegistrationCredential(payload);
    if (!credential) return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });

    const challenge = readChallengeCookie(cookieHeader);
    if (!challenge) return NextResponse.json({ ok: false, error: 'Missing challenge' }, { status: 400 });

    const verification = await verifyRegistrationResponse({
      expectedChallenge: challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      response: credential,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      credentialTransports,
    } = verification.registrationInfo;

    const credIdStr = toBase64Url(credentialID);
    const pubKeyStr = toBase64Url(credentialPublicKey);

    const supabase = supabaseServer();

    const { error: upsertErr } = await supabase
      .from('webauthn_credentials')
      .upsert(
        {
          user_id: userId,
          credential_id: credIdStr,
          public_key: pubKeyStr,
          counter: counter ?? 0,
          device_type: credentialDeviceType ?? null,
          backed_up: credentialBackedUp ?? null,
          transports: credentialTransports ?? null,
        },
        { onConflict: 'credential_id' }
      );
    if (upsertErr) {
      console.error('[webauthn/verify] credential upsert failed', upsertErr);
      return NextResponse.json({ ok: false, error: 'DB upsert failed' }, { status: 500 });
    }

    const { data: urow, error: urowErr } = await supabase
      .from('users')
      .select('passkey_cred_ids')
      .eq('id', userId)
      .single();
    if (urowErr) {
      console.error('[webauthn/verify] user row load failed', urowErr);
      return NextResponse.json({ ok: false, error: 'User row missing' }, { status: 500 });
    }

    const ids: string[] = Array.isArray(urow?.passkey_cred_ids) ? urow.passkey_cred_ids : [];
    if (!ids.includes(credIdStr)) ids.push(credIdStr);

    const { error: userUpdateErr } = await supabase
      .from('users')
      .update({ passkey_enabled: true, passkey_cred_ids: ids })
      .eq('id', userId);
    if (userUpdateErr) {
      console.error('[webauthn/verify] users update failed', userUpdateErr);
      return NextResponse.json({ ok: false, error: 'User update failed' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, credential_id: credIdStr });
    clearChallengeCookie(res);
    return res;
  } catch (err: any) {
    console.error('[webauthn/verify] error', err);
    return NextResponse.json({ ok: false, error: 'Verification exception', detail: String(err?.message || err) }, { status: 500 });
  }
}