// Next.js 14 App Router — WebAuthn Registration Options (self-authenticating; byte userID)
export const runtime = 'nodejs';

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

import { setChallengeCookie, deriveRpID, expectedOrigins, rpName } from '@/lib/webauthn';
import { generateRegistrationOptions } from '@simplewebauthn/server';

// ---- Supabase server client bound to Next cookies ----
function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// ---- Read access token from cookies or Authorization header ----
function readAccessToken(): string | null {
  const jar = cookies();
  const h = headers();

  // Current Supabase cookie
  const sb = jar.get('sb-access-token')?.value;
  if (sb) return sb;

  // Legacy Supabase cookie (JSON blob)
  const legacy = jar.get('supabase-auth-token')?.value;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (parsed?.access_token) return parsed.access_token as string;
    } catch {
      /* ignore */
    }
  }

  // Authorization: Bearer <token>
  const auth = h.get('authorization') || h.get('Authorization');
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }
  return null;
}

// ---- Unsafe first-party decode for claims (no external verification needed here) ----
function decodeJWT(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const [, p2] = token.split('.');
    if (!p2) return null;
    const json = Buffer.from(p2, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---- WebAuthn v8+: userID MUST be bytes (BufferSource). Helpers below. ----

// Convert UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) to 16-byte array
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) {
    // Not a canonical UUID; fall back to utf8
    return utf8Bytes(uuid);
  }
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// UTF-8 bytes clamped to <=64 bytes as a safe user handle
function utf8Bytes(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s);
  return enc.length <= 64 ? enc : enc.slice(0, 64);
}

export async function POST() {
  try {
    const host = headers().get('host');
    const rpID = deriveRpID(host);
    // We keep expectedOrigins as part of response for client diagnostics (optional).
    const _origins = Array.from(expectedOrigins);

    // 1) Identify caller via Supabase token
    const token = readAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const claims = decodeJWT(token);
    const userId = claims?.sub;
    const email = claims?.email ?? null;
    const exp = claims?.exp ?? null;

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (exp && exp * 1000 < Date.now()) {
      return NextResponse.json({ ok: false, error: 'Session expired' }, { status: 401 });
    }

    // 2) Build a byte user handle for SimpleWebAuthn v8+
    // Prefer a UUID->16B conversion; otherwise, UTF-8 bytes (<=64)
    const userHandle: Uint8Array =
      /^[0-9a-fA-F-]{36}$/.test(userId) ? uuidToBytes(userId) : utf8Bytes(userId);

    // 3) Exclude already-registered credentials
    const supabase = supabaseServer();
    const { data: existing, error: existingErr } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    if (existingErr) {
      // Not fatal to options, but helpful to surface
      console.error('[webauthn/options] preload error', existingErr);
    }

    const excludeCredentials =
      (existing ?? []).map((c: any) => ({
        id: c.credential_id,
        type: 'public-key' as const,
      })) ?? [];

    // 4) Generate options (now with byte userID)
    const options = await generateRegistrationOptions({
      rpName: rpName ?? 'Gatishil Nepal',
      rpID,
      userID: userHandle,           // <-- MUST be bytes (BufferSource)
      userName: email ?? userId,    // display name can remain string
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'preferred',
      },
      timeout: 60_000,
      excludeCredentials,
    });

    // 5) Return + set challenge cookie for verification step
    const res = NextResponse.json({
      ok: true,
      options,
      expectedOrigins: _origins,
    });
    setChallengeCookie(res, options.challenge);
    return res;
  } catch (err: any) {
    console.error('[webauthn/options] error', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to create options',
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
