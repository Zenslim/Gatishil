// app/api/webauthn/verify/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { RP_ID, EXPECTED_ORIGINS, CHALLENGE_COOKIE } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { userId, response } = await req.json();
    console.log('[webauthn/verify] userId:', userId);
    if (!userId || !response) {
      return NextResponse.json({ ok: false, error: 'Missing userId/response' }, { status: 400 });
    }

    const challenge = cookies().get(CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      return NextResponse.json({ ok: false, error: 'No outstanding challenge' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });
    }

    cookies().delete(CHALLENGE_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[webauthn/verify] error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
