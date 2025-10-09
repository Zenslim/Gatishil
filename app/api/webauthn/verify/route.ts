import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'

import { EXPECTED_ORIGINS, RP_ID } from '@/lib/webauthn'

const rpID = process.env.RP_ID ?? RP_ID
const configuredOrigins = process.env.NEXT_PUBLIC_APP_ORIGIN
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const expectedOrigins = configuredOrigins?.length ? configuredOrigins : EXPECTED_ORIGINS

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const expectedChallenge = cookies().get('wa_chal')?.value
    if (!expectedChallenge) return NextResponse.json({ error: 'Missing challenge' }, { status: 400 })

    const verification = await verifyRegistrationResponse({
      response: body?.response,
      expectedChallenge,
      expectedOrigin: expectedOrigins.length === 1 ? expectedOrigins[0] : expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: true,
    })

    if (!verification.verified) return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify failed' }, { status: 500 })
  }
}
