import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENABLE_WEBAUTHN = process.env.ENABLE_WEBAUTHN === 'true';

// RP ID must match the effective cookie origin (apex without scheme).
// If not provided, we try to derive from NEXT_PUBLIC_SITE_URL.
const RP_ID =
  process.env.WEBAUTHN_RP_ID ||
 (process.env.NEXT_PUBLIC_APP_ORIGIN
    ? new URL(process.env.NEXT_PUBLIC_APP_ORIGIN).hostname
    : (process.env.ORIGIN ? new URL(process.env.ORIGIN).hostname : undefined));;

// ---- small helpers ----
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

// ---- handlers ----
export async function POST(_req: NextRequest) {
  if (!ENABLE_WEBAUTHN) {
    return NextResponse.json(
      { error: 'WebAuthn login is disabled (set ENABLE_WEBAUTHN=true).' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!RP_ID) {
    return NextResponse.json(
      { error: 'WEBAUTHN_RP_ID or NEXT_PUBLIC_SITE_URL is required.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Discoverable (resident) credentials: allowCredentials left empty so the authenticator can pick.
  const challenge = randomChallenge(32);
  const challengeB64u = toBase64Url(challenge);

  const publicKey = {
    challenge: challengeB64u,         // client converts b64url → ArrayBuffer before navigator.credentials.get
    rpId: RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    allowCredentials: [] as Array<never>,
    extensions: { credProps: true },
  };

  const res = NextResponse.json({ publicKey }, { status: 200 });
  res.headers.set('Cache-Control', 'no-store');

  // Bind the challenge to the browser for later /api/webauthn/login/verify
  // (httpOnly so JS can’t read it; short TTL).
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
