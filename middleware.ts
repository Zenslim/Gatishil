import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/onboard', '/people'] as const

const PROTECTED_MATCHERS = Array.from(
  new Set(
    PROTECTED_PREFIXES.map((prefix) => {
      const normalized = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
      return `${normalized}/:path*`
    }),
  ),
)

function hasSupabaseSession(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value
  if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') return true

  const legacy = req.cookies.get('supabase-auth-token')?.value
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy)
      if (parsed && typeof parsed === 'object' && parsed.access_token) return true
    } catch {
      // ignore malformed legacy cookie values
    }
  }

  return false
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const path = url.pathname

  const protectedPath = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))
  if (!protectedPath) return NextResponse.next()

  // Allow onboarding links that arrive with a Supabase `code` to exchange for a session first
  if (path.startsWith('/onboard') && url.searchParams.has('code')) {
    return NextResponse.next()
  }

  if (hasSupabaseSession(req)) return NextResponse.next()

  const loginUrl = new URL('/login', url)
  const nextPath = url.search ? `${path}${url.search}` : path
  loginUrl.searchParams.set('next', nextPath)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: PROTECTED_MATCHERS,
}
