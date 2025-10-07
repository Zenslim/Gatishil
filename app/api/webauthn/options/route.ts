export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RP_NAME, RP_ID, CHALLENGE_COOKIE, CHALLENGE_TTL } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    const username = body?.username;
    console.log('[webauthn/options] BODY →', body);

    if (!userId || !username) {
      return NextResponse.json({ ok:false, error:'Missing userId/username' }, { status:400 });
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: String(userId),
      userName: String(username),
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    cookies().set({
      name: CHALLENGE_COOKIE,
      value: options.challenge,
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
      maxAge: CHALLENGE_TTL,
    });

    return NextResponse.json(options);
  } catch (e: any) {
    console.error('[webauthn/options] ERROR →', e);
    return NextResponse.json({ ok:false, error: e?.message || 'Server error in /webauthn/options' }, { status:500 });
  }
}
