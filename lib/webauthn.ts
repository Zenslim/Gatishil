import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

const RP_NAME = process.env.RP_NAME || 'Chautari';
const RP_ID = process.env.RP_ID || '';
const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || '';

const userChallenges = new Map<string, string>();

function assertEnv() {
  if (!RP_ID) throw new Error('RP_ID is missing');
  if (!ORIGIN) throw new Error('NEXT_PUBLIC_APP_ORIGIN is missing');
}

export async function createRegOptions(userId: string, username: string) {
  assertEnv();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userId,
    userName: username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });
  userChallenges.set(userId, options.challenge);
  return options;
}

export async function verifyRegResponse(userId: string, response: any) {
  assertEnv();
  const expectedChallenge = userChallenges.get(userId);
  if (!expectedChallenge) {
    throw new Error('No outstanding challenge for this user');
  }
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });
  userChallenges.delete(userId);
  return verification;
}
