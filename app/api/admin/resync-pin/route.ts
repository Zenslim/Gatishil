// app/api/admin/resync-pin/route.ts (protect with x-admin-secret)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { derivePasswordFromPinSync } from '@/lib/crypto/pin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== process.env.X_ADMIN_SECRET) return new NextResponse('Forbidden', { status: 403 });

  const { userId, pin } = await req.json();
  const admin = getSupabaseAdmin();

  const { data: pinRow } = await admin.from('auth_local_pin')
    .select('salt, salt_b64').eq('user_id', userId).maybeSingle();
  if (!pinRow) return NextResponse.json({ error: 'No PIN row' }, { status: 404 });

  let saltB64 = (pinRow.salt_b64 || pinRow.salt || '') as string;
  if (!saltB64) return NextResponse.json({ error: 'No salt' }, { status: 409 });
  if (saltB64.startsWith('\\x')) saltB64 = Buffer.from(saltB64.slice(2), 'hex').toString('base64');
  saltB64 = saltB64.replace(/-/g, '+').replace(/_/g, '/');

  const { derivedB64u } = derivePasswordFromPinSync({
    pin,
    userId,
    saltB64,
    pepper: process.env.PIN_PEPPER!,
  });

  const { error } = await admin.auth.admin.updateUserById(userId, { password: derivedB64u });
  if (error) return NextResponse.json({ error: 'GoTrue update failed' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
