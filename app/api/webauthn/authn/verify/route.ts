import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server env missing: SUPABASE keys' }, { status: 500 });
  }
  const supabaseAdmin = createClient(url, key);

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

  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app').hostname;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app';

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
