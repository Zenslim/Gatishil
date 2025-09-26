// Notes: runtime/dynamic exports prevent Next from statically evaluating these files at build.
// Supabase admin client is created *inside* the handler to avoid env reads at import time.
import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
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

  const authCookie = cookies().get('sb-access-token')?.value;
  if (!authCookie) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Note: Supabase admin getUser(token) requires service role, which we have.
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authCookie);
  if (error || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const rpName = 'Gatishil';
  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gatishil.vercel.app').hostname;

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email ?? user.id,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
  });

  await supabaseAdmin.from('webauthn_challenges').upsert({
    user_id: user.id,
    challenge: options.challenge,
    type: 'registration',
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ...options, timeout: 60000, extensions: {} });
}
