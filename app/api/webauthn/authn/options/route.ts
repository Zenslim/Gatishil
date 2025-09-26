import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL!).hostname;

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
  });

  await supabaseAdmin.from('webauthn_challenges').insert({
    user_id: null,
    challenge: options.challenge,
    type: 'authentication',
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ...options, timeout: 60000, extensions: {} });
}
