// Dynamic: avoid env reads at build time
import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
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

  // Expect Authorization: Bearer <access_token>
  const authz = req.headers.get('authorization') || '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
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
