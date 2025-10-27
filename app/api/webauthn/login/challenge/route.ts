import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // never cache; challenge must be fresh

const ENABLE_WEBAUTHN = process.env.ENABLE_WEBAUTHN === 'true';

/**
 * RP ID resolution (single source of truth)
 * Priority:
 * 1) WEBAUTHN_RP_ID (explicit override)
 * 2) NEXT_PUBLIC_APP_ORIGIN → hostname
 * 3) ORIGIN → hostname
 *
 * This mirrors your current env contract and avoids accidental use of NEXT_PUBLIC_SITE_URL.
 * RP ID must equal the effective domain of the webauthn origin or its registrable parent
 * (e.g., origin https://www.gatishilnepal.org → rpId either "www.gatishilnepal.org" or "gatishilnepal.org" depending on how you registered credentials).
 */
const RP_ID =
  process.env.WEBAUTHN_RP_ID ||
  (process.env.NEXT_PUBLIC_APP_ORIGIN
    ? new URL(process.env.NEXT_PUBLIC_APP_ORIGIN).hostname
    : process.env.ORIGIN
    ? new URL(process.env.ORIGIN).hostname
    : undefined);

// --- helpers ---
function randomChallenge(bytes = 32): Uint8Array {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return buf;
}
function toBase64Url(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = Buffer.from(s, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// --- handlers ---
export async function POST(_req: NextRequest) {
  if (!ENABLE_WEBAUTHN) {
    return NextResponse.json(
      { error: 'WebAuthn login is disabled (set ENABLE_WEBAUTHN=true).' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!RP_ID) {
    return NextResponse.json(
      {
        error:
          'RP ID unresolved. Set WEBAUTHN_RP_ID or NEXT_PUBLIC_APP_ORIGIN (or ORIGIN).',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const challenge = randomChallenge(32);
  const challengeB64u = toBase64Url(challenge);

  // Login (assertion) options — note: no credProps here (create-only).
  const publicKey: Omit<PublicKeyCredentialRequestOptions, 'challenge'> & {
    // we ship challenge as base64url for transport; client must b64url→ArrayBuffer before navigator.credentials.get(...)
    challenge: string;
  } = {
    challenge: challengeB64u,
    rpId: RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    // Keep empty to allow discoverable credentials; populate if you require specific credential IDs.
    allowCredentials: [],
  };

  const res = NextResponse.json({ publicKey }, { status: 200 });
  res.headers.set('Cache-Control', 'no-store');

  // Bind challenge for /api/webauthn/login/verify (httpOnly; short TTL).
  res.cookies.set('webauthn_login_challenge', challengeB64u, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 3, // 3 minutes
  });

  return res;
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST /api/webauthn/login/challenge' },
    { status: 405, headers: { 'Cache-Control': 'no-store' } }
  );
}
