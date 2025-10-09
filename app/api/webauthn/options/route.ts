import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'

const rpID = process.env.RP_ID as string
const rpName = process.env.RP_NAME || 'Gatishil Nepal'

function textToBytes(s: string) { return new TextEncoder().encode(s) }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId: string = body?.userId
    const username: string = body?.username || userId

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (!rpID) return NextResponse.json({ error: 'Missing RP_ID' }, { status: 500 })

    const options = await generateRegistrationOptions({
      rpID, rpName,
      userName: username,
      userID: textToBytes(userId), // binary per spec
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
    })

    cookies().set('wa_chal', options.challenge, { httpOnly: true, maxAge: 600, secure: true, sameSite: 'strict', path: '/' })
    return NextResponse.json(options)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create options' }, { status: 500 })
  }
}
