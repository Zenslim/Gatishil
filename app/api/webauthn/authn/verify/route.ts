import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const asResp = await req.json();

  const { data: ch } = await supabaseAdmin
    .from('webauthn_challenges')
    .select('*')
    .eq('type', 'authentication')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!ch) return NextResponse.json({ error: 'Challenge not found' }, { status: 400 });

  const credIdB64u = asResp.id as string;
  const { data: cred } = await supabaseAdmin
    .from('webauthn_credentials')
    .select('*')
    .eq('id', credIdB64u)
    .single();

  if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 400 });

  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL!).hostname;
  const origin = process.env.NEXT_PUBLIC_SITE_URL!;

  const verification = await verifyAuthenticationResponse({
    response: asResp,
    expectedChallenge: ch.challenge,
    expectedRPID: rpID,
    expectedOrigin: origin,
    authenticator: {
      credentialID: Buffer.from(cred.id, 'base64url'),
      credentialPublicKey: Buffer.from(cred.public_key, 'base64'),
      counter: cred.counter ?? 0,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  await supabaseAdmin
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('id', cred.id);

  return NextResponse.json({ verified: true, user_id: cred.user_id });
}
