import { NextResponse } from 'next/server';
const ENABLE_WEBAUTHN = process.env.ENABLE_WEBAUTHN === 'true';
export async function POST() {
  if (!ENABLE_WEBAUTHN) return new NextResponse('WebAuthn disabled', { status: 404 });
  return NextResponse.json({ error: 'Not implemented in this build' }, { status: 501 });
}
