import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

function sendJSONWithSetCookies(resWithCookies: NextResponse, body: any, status = 200) {
  const out = NextResponse.json(body, { status })
  // Forward ONLY Set-Cookie headers to avoid duplicates
  const setCookies =
    (resWithCookies as any).headers.getSetCookie?.() ||
    Array.from(resWithCookies.headers)
      .filter(([k]) => k.toLowerCase() === 'set-cookie')
      .map(([, v]) => v as string)

  if (Array.isArray(setCookies)) {
    for (const c of setCookies) out.headers.append('set-cookie', c)
  }
  return out
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const res = new NextResponse()
  const supabase = getSupabaseServer({ response: res })

  try {
    const { email, token } = await req.json()
    if (!email || !token) {
      await supabase.commitCookies(res)
      return sendJSONWithSetCookies(res, { ok: false, error: 'bad_request' }, 400)
    }

    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

    if (error || !data?.session) {
      await supabase.commitCookies(res)
      return sendJSONWithSetCookies(res, { ok: false, error: error?.message || 'invalid_code' }, 400)
    }

    // Atomically set the server session cookies on THIS response
    const at = data.session.access_token
    const rt = data.session.refresh_token
    await supabase.auth.setSession({ access_token: at, refresh_token: rt })

    // Commit cookies and respond (forwarding Set-Cookie only)
    await supabase.commitCookies(res)
    return sendJSONWithSetCookies(res, { ok: true, channel: 'email', user: data.user })
  } catch (e: any) {
    await supabase.commitCookies(res)
    return sendJSONWithSetCookies(res, { ok: false, error: e?.message || 'server_error' }, 500)
  }
}
