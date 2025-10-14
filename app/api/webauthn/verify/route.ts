// Next.js 14 App Router — WebAuthn Registration Verify (Service Role + Auth Admin API check)
export const runtime = 'nodejs';

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseService } from '@supabase/supabase-js';
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

// ── Cookie-bound SSR client (reads under anon/edge context)
function supabaseSSR() {
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

// ── Service Role client (bypasses RLS; NEVER expose key to browser)
function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseService<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Read token from cookies or Authorization
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

// ── Unsafe first-party decode (we only need sub/email/exp)
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

    // 1) Caller identity
    const token = readAccessToken();
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const claims = decodeJWT(token);
    const userId = claims?.sub;
    const exp = claims?.exp ?? null;
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (exp && exp * 1000 < Date.now()) return NextResponse.json({ ok: false, error: 'Session expired' }, { status: 401 });

    // 2) Payload + challenge
    const payload = await req.json();
    const credential: RegistrationResponseJSON | null = extractRegistrationCredential(payload);
    if (!credential) return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });

    const challenge = readChallengeCookie(cookieHeader);
    if (!challenge) return NextResponse.json({ ok: false, error: 'Missing challenge' }, { status: 400 });

    // 3) Verify attestation
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

    // 4) Persist using SERVICE ROLE (bypass RLS/policies)
    const svc = supabaseService();

    // 4a) Assert the user exists in this project using Auth Admin API
    const { data: userAdmin, error: adminErr } = await svc.auth.admin.getUserById(userId);
    if (adminErr) {
      console.error('[webauthn/verify] auth admin getUserById failed →', adminErr);
      return NextResponse.json(
        { ok: false, error: 'Auth lookup failed', detail: adminErr },
        { status: 500 }
      );
    }
    if (!userAdmin?.user) {
      return NextResponse.json(
        { ok: false, error: 'Unknown user for this Supabase project', detail: { userId } },
        { status: 409 }
      );
    }

    // 4b) Upsert credential
    const { error: upsertErr } = await svc
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
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'credential_id' }
      );

    if (upsertErr) {
      console.error('[webauthn/verify] credential upsert failed →', upsertErr);
      return NextResponse.json(
        {
          ok: false,
          error: 'DB upsert failed',
          detail: {
            message: upsertErr.message ?? null,
            code: upsertErr.code ?? null,
            hint: upsertErr.hint ?? null,
            details: upsertErr.details ?? null,
          },
        },
        { status: 500 }
      );
    }

    // 4c) Passkey flags (user_security) — via service role; idempotent
    const { data: secRow, error: secSelErr } = await svc
      .from('user_security')
      .select('passkey_cred_ids')
      .eq('user_id', userId)
      .maybeSingle();

    // Ignore "No rows" code; otherwise surface details
    if (secSelErr && (secSelErr as any).code !== 'PGRST116') {
      console.error('[webauthn/verify] user_security select failed →', secSelErr);
      return NextResponse.json(
        { ok: false, error: 'User flags read failed', detail: secSelErr },
        { status: 500 }
      );
    }

    if (!secRow) {
      const { error: secInsErr } = await svc
        .from('user_security')
        .insert({
          user_id: userId,
          passkey_enabled: true,
          passkey_cred_ids: [credIdStr],
          updated_at: new Date().toISOString(),
        });
      if (secInsErr) {
        console.error('[webauthn/verify] user_security insert failed →', secInsErr);
        return NextResponse.json(
          { ok: false, error: 'User flags insert failed', detail: secInsErr },
          { status: 500 }
        );
      }
    } else {
      const ids: string[] = Array.isArray(secRow.passkey_cred_ids) ? secRow.passkey_cred_ids : [];
      if (!ids.includes(credIdStr)) ids.push(credIdStr);
      const { error: secUpdErr } = await svc
        .from('user_security')
        .update({
          passkey_enabled: true,
          passkey_cred_ids: ids,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      if (secUpdErr) {
        console.error('[webauthn/verify] user_security update failed →', secUpdErr);
        return NextResponse.json(
          { ok: false, error: 'User flags update failed', detail: secUpdErr },
          { status: 500 }
        );
      }
    }

    // 5) Success
    const res = NextResponse.json({ ok: true, credential_id: credIdStr });
    clearChallengeCookie(res);
    return res;
  } catch (err: any) {
    console.error('[webauthn/verify] error', err);
    return NextResponse.json(
      { ok: false, error: 'Verification exception', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
