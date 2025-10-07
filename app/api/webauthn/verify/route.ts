export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { RP_ID, EXPECTED_ORIGINS, CHALLENGE_COOKIE } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    const response = body?.response;
    console.log('[webauthn/verify] BODY →', Object.keys(body || {}));

    if (!userId || !response) {
      return NextResponse.json({ ok:false, error:'Missing userId/response' }, { status:400 });
    }

    const challenge = cookies().get(CHALLENGE_COOKIE)?.value;
    if (!challenge) {
      return NextResponse.json({ ok:false, error:'No outstanding challenge' }, { status:400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return NextResponse.json({ ok:false, error:'Verification failed' }, { status:400 });
    }

    cookies().delete(CHALLENGE_COOKIE);
    return NextResponse.json({ ok:true });
  } catch (e: any) {
    console.error('[webauthn/verify] ERROR →', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Server error in /webauthn/verify' }, { status:500 });
  }
}
