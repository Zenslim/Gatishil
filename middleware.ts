// middleware.ts — protect selected paths; allow Supabase ?code=; trust ONLY Supabase cookies.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Single source of truth: protected path prefixes
const PROTECTED = ['/dashboard', '/onboard', '/people'];

// Helpers
function isProtectedPath(pathname: string) {
  return PROTECTED.some((p) => pathname.startsWith(p));
}
function hasSupabaseCode(url: URL) {
  // Supabase magic-link/OTP/OAuth callback carries ?code=
  return url.searchParams.has('code');
}
function isStatic(pathname: string) {
  return pathname.startsWith('/_next') ||
         pathname.startsWith('/static') ||
         pathname.startsWith('/favicon') ||
         pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|txt|map)$/i);
}

/** Strict session check: ONLY trust Supabase cookies set by our app */
function isSignedIn(req: NextRequest) {
  // Modern helpers: sb-access-token / sb-refresh-token
  const access = req.cookies.get('sb-access-token')?.value;
  const refresh = req.cookies.get('sb-refresh-token')?.value;
  // Legacy helpers: sb:token (stringified JSON with access/refresh)
  const legacy = req.cookies.get('sb:token')?.value;
  return Boolean(access || refresh || legacy);
}

// Debug headers so we can see decisions in DevTools
function debugHeaders(reason: string, path: string) {
  const h = new Headers();
  h.set('x-guard', reason);
  h.set('x-guard-path', path);
  return h;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  if (isStatic(pathname) || pathname.startsWith('/login')) {
    return NextResponse.next({ headers: debugHeaders('skip:static/login', pathname) });
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ headers: debugHeaders('skip:not-protected', pathname) });
  }

  // Let Supabase complete session creation first
  if (hasSupabaseCode(url)) {
    return NextResponse.next({ headers: debugHeaders('allow:code-handshake', pathname) });
  }

  // Enforce auth with strict cookie check
  if (!isSignedIn(req)) {
    const login = new URL('/login', url);
    login.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(login, { headers: debugHeaders('redirect:login', pathname) });
  }

  return NextResponse.next({ headers: debugHeaders('allow:authed', pathname) });
}

export const config = {
  matcher: PROTECTED.map((p) => `${p}/:path*`),
};
