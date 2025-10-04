import { NextResponse } from 'next/server';
import { verifyRegResponse } from '@/lib/webauthn';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, response } = await req.json();
    if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });

    const result = await verifyRegResponse(userId, response);
    const info = result.registrationInfo;
    if (!info) return NextResponse.json({ ok: false, error: 'No registrationInfo' }, { status: 400 });

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports,
    } = info;

    const { error } = await supabase.from('webauthn_credentials').upsert({
      user_id: userId,
      credential_id: Buffer.from(credentialID).toString('base64url'),
      public_key: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: transports || null,
    }, { onConflict: 'credential_id' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verification failed' }, { status: 500 });
  }
}
