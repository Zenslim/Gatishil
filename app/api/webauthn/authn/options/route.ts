import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server env missing: SUPABASE keys' }, { status: 500 });
  }
  const supabaseAdmin = createClient(url, key);

  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app').hostname;

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
