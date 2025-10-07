// app/api/webauthn/options/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (not Edge)
export const dynamic = 'force-dynamic'; // allow setting cookies

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RP_NAME, RP_ID, CHALLENGE_COOKIE, CHALLENGE_TTL } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { userId, username } = await req.json();
    console.log('[webauthn/options] userId:', userId);
    if (!userId || !username) {
      return NextResponse.json({ ok: false, error: 'Missing userId/username' }, { status: 400 });
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
    console.error('[webauthn/options] error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
