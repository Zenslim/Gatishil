import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Redirect logged-in users away from /join and /login to /dashboard.
// We treat the presence of Supabase auth cookies as "logged in" for edge speed.
const AUTH_COOKIES = new Set([
  'sb-access-token',
  'sb-refresh-token',
  // legacy cookie keys that may appear on some browsers
  'sb:token',
  'sb:refresh'
])

export const config = {
  matcher: ['/join', '/login'],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // quick check for any Supabase auth cookie
  const hasAuthCookie = req.cookies.getAll().some(c => AUTH_COOKIES.has(c.name))

  if (hasAuthCookie && (pathname === '/join' || pathname === '/login')) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
