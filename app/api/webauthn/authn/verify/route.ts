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
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
    }

    // Verify WebAuthn registration with the expected challenge/origin/RP ID
    const result = await verifyRegResponse(userId, response);
    const info = result.registrationInfo;
    if (!info) {
      return NextResponse.json({ ok: false, error: 'No registrationInfo' }, { status: 400 });
    }

    // Safely extract fields (some props aren't present in all versions)
    const credentialID_b64url = Buffer.from(info.credentialID).toString('base64url');
    const publicKey_b64url = Buffer.from(info.credentialPublicKey).toString('base64url');
    const counter = typeof info.counter === 'number' ? info.counter : 0;

    // These are not always typed on registrationInfo depending on lib version
    const device_type = (info as any).credentialDeviceType ?? null;
    const backed_up = (info as any).credentialBackedUp ?? null;

    // Transports (if provided) come from the client’s attestation response
    // e.g. response.response.transports in some browsers. Optional.
    const transports = Array.isArray(response?.response?.transports)
      ? response.response.transports
      : null;

    const { error } = await supabase
      .from('webauthn_credentials')
      .upsert(
        {
          user_id: userId,
          credential_id: credentialID_b64url,
          public_key: publicKey_b64url,
          counter,
          device_type,
          backed_up,
          transports, // column is text[]; null is fine if unsupported
        },
        { onConflict: 'credential_id' }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verification failed' }, { status: 500 });
  }
}
