import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge guard to reduce flicker and enforce sane redirects.
 * - If a Supabase session cookie exists, /login and /join redirect to /dashboard.
 * - If no session and path is /dashboard, send to /join.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const hasSession = req.cookies.has('sb-access-token') || req.cookies.has('sb:token') || req.cookies.has('supabase-auth-token')

  const pathname = url.pathname

  // Already authenticated → never show join/login
  if (hasSession && (pathname === '/login' || pathname === '/join')) {
    const to = new URL('/dashboard', req.url)
    return NextResponse.redirect(to)
  }

  // Unauthed user trying to access /dashboard → go to /join
  if (!hasSession && pathname === '/dashboard') {
    const to = new URL('/join', req.url)
    return NextResponse.redirect(to)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/join', '/dashboard'],
}
