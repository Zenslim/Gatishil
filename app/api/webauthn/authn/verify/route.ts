import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { RP_ID, EXPECTED_ORIGINS, CHALLENGE_COOKIE } from '@/lib/webauthn';

export async function POST(req: Request) {
  const { userId, response } = await req.json();
  if (!userId || !response)
    return NextResponse.json({ ok: false, error: 'Missing userId/response' }, { status: 400 });

  const challenge = cookies().get(CHALLENGE_COOKIE)?.value;
  if (!challenge)
    return NextResponse.json({ ok: false, error: 'No outstanding challenge' }, { status: 400 });

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: RP_ID,
    });

    if (!verification.verified)
      return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });

    cookies().delete(CHALLENGE_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Verification error' }, { status: 400 });
  }
}
