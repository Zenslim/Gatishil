import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json()
    if (!phone || !token) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({
      cookies
    })

    // This call both verifies and writes Set-Cookie into Next's cookies store
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

    if (error || !data?.session) {
      return NextResponse.json({ ok: false, error: error?.message || 'invalid_code' }, { status: 400 })
    }

    // No manual setSession or commitCookies needed. SSR client already wrote cookies.
    return NextResponse.json({ ok: true, channel: 'phone', user: data.user })
  } catch (e: any) {
    console.error('phone/verify route 500:', e?.message || e)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
