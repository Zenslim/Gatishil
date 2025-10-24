// app/api/auth/sync/route.ts
// Normalizes token sync from browser → server using @supabase/ssr getSupabaseServer.
// Accepts either { access_token, refresh_token } OR
// { event:'TOKEN_REFRESHED', session:{ access_token, refresh_token } }

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

type LegacyBody = { access_token?: string; refresh_token?: string }
type HelperBody = { event?: string; session?: { access_token?: string; refresh_token?: string } }

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const res = new NextResponse()
  const supabase = getSupabaseServer({ response: res })

  let at: string | undefined
  let rt: string | undefined

  try {
    const body = (await req.json()) as LegacyBody & HelperBody
    if (body?.session?.access_token || body?.session?.refresh_token) {
      at = body.session.access_token
      rt = body.session.refresh_token
    } else {
      at = body.access_token
      rt = body.refresh_token
    }
  } catch {
    // empty body is OK for health checks; just return ok:false
  }

  if (!at || !rt) {
    await supabase.commitCookies(res)
    return NextResponse.json({ ok: false, error: 'missing_tokens' }, { status: 400, headers: res.headers })
  }

  try {
    await supabase.auth.setSession({ access_token: at, refresh_token: rt })
    await supabase.commitCookies(res)
    return NextResponse.json({ ok: true }, { status: 200, headers: res.headers })
  } catch (e: any) {
    await supabase.commitCookies(res)
    return NextResponse.json({ ok: false, error: e?.message || 'set_session_failed' }, { status: 400, headers: res.headers })
  }
}

export async function GET() {
  const res = new NextResponse()
  const supabase = getSupabaseServer({ response: res })
  const { data } = await supabase.auth.getUser()
  await supabase.commitCookies(res)
  return NextResponse.json({ ok: true, authenticated: !!data.user }, { headers: res.headers })
}
