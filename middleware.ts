// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Read an access token from either current or legacy Supabase cookies.
 * - Current: sb-access-token
 * - Legacy:  supabase-auth-token (JSON with access_token)
 */
function resolveAccessToken(req: NextRequest): string | null {
  const sb = req.cookies.get('sb-access-token')?.value
  if (sb) return sb
  const legacy = req.cookies.get('supabase-auth-token')?.value
  if (!legacy) return null
  try {
    const parsed = JSON.parse(legacy)
    const token = parsed?.access_token
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch {
    return null
  }
}

/** Paths that must NEVER be intercepted (public) */
function isPublicPath(pathname: string): boolean {
  return [
    /^\/$/,                    // home
    /^\/join(?:\/.*)?$/,       // join entry + variations
    /^\/onboard(?:\/.*)?$/,    // onboarding flow
    /^\/verify(?:\/.*)?$/,     // email verification / link expired
    /^\/api\/.*$/,             // all API routes
    /^\/_next\/.*$/,           // Next.js internals
    /^\/favicon\.ico$/,        // assets
    /^\/images\/.*$/,
    /^\/assets\/.*$/,
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
  ].some((rx) => rx.test(pathname))
}

/** Pages that require an authenticated session */
function isProtectedPath(pathname: string): boolean {
  return [
    /^\/dashboard(?:\/.*)?$/,
    /^\/security(?:\/.*)?$/,
    /^\/account(?:\/.*)?$/,
  ].some((rx) => rx.test(pathname))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) Skip public routes entirely (prevents redirect loops)
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // 2) Prepare a response we can mutate cookies on
  const res = NextResponse.next()

  // 3) Create SSR client — lets us read/refresh session if present
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => req.cookies.get(key)?.value,
        set: (key: string, value: string, options: any) => {
          res.cookies.set({ name: key, value, ...options })
        },
        remove: (key: string, options: any) => {
          res.cookies.set({ name: key, value: '', ...options })
        },
      },
    }
  )

  // 4) Check for session presence (fast via cookie; fall back to server call)
  let hasSession = !!resolveAccessToken(req)
  if (!hasSession) {
    try {
      const { data } = await supabase.auth.getSession()
      hasSession = !!data.session
    } catch {
      hasSession = false
    }
  }

  // 5) If trying to access a protected page without a session → send to login with next
  if (isProtectedPath(pathname) && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    const params = new URLSearchParams({ next: req.nextUrl.pathname + req.nextUrl.search })
    url.search = `?${params.toString()}`
    return NextResponse.redirect(url, 307)
  }

  // 6) If already authenticated and lands on /login → go to `next` or dashboard
  if (pathname === '/login' && hasSession) {
    const params = new URLSearchParams(req.nextUrl.search)
    const next = params.get('next') || '/dashboard'
    const url = req.nextUrl.clone()
    url.pathname = next
    url.search = ''
    return NextResponse.redirect(url, 307)
  }

  // 7) Otherwise, allow
  return res
}

// Limit where middleware runs. Keep broad, but exclude obvious static internals.
export const config = {
  matcher: ['/((?!_next|favicon.ico|images|assets|robots.txt|sitemap.xml).*)'],
}
