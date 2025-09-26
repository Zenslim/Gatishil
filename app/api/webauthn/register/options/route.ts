import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const authCookie = cookies().get('sb-access-token')?.value;
  if (!authCookie) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authCookie);
  if (error || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const rpName = 'Gatishil';
  const rpID = new URL(process.env.NEXT_PUBLIC_SITE_URL!).hostname;

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
