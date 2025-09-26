import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
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

  // Optionally confirm the bearer; not strictly required for verify
  const authz = req.headers.get('authorization') || '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7) : null;

  const attResp = await req.json();

  const { data: ch } = await supabaseAdmin
    .from('webauthn_challenges')
    .select('*')
    .eq('type', 'registration')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!ch) return NextResponse.json({ error: 'Challenge not found' }, { status: 400 });

  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app').hostname;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app';

  const verification = await verifyRegistrationResponse({
    response: attResp,
    expectedChallenge: ch.challenge,
    expectedRPID: rpID,
    expectedOrigin: origin,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const {
    credentialPublicKey,
    credentialID,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  await supabaseAdmin.from('webauthn_credentials').upsert({
    id: Buffer.from(credentialID).toString('base64url'),
    user_id: ch.user_id,
    public_key: Buffer.from(credentialPublicKey).toString('base64'),
    counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
  });

  return NextResponse.json({ verified: true });
}
