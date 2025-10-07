import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RP_NAME, RP_ID, CHALLENGE_COOKIE, CHALLENGE_TTL } from '@/lib/webauthn';

export async function POST(req: Request) {
  const { userId, username } = await req.json();
  if (!userId || !username)
    return NextResponse.json({ ok: false, error: 'Missing userId/username' }, { status: 400 });

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
}
