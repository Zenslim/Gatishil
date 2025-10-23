// middleware.ts — protects selected paths, allows Supabase ?code=, and emits debug headers.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Single source of truth: protected path prefixes
const PROTECTED = ['/dashboard', '/onboard', '/people'];

// Helpers
function isProtectedPath(pathname: string) {
  return PROTECTED.some((p) => pathname.startsWith(p));
}
function hasSupabaseCode(url: URL) {
  return url.searchParams.has('code');
}
function isSignedIn(req: NextRequest) {
  const modern = req.cookies.get('sb-access-token')?.value;
  const legacy = req.cookies.get('sb:token')?.value;
  const bearer = req.headers.get('authorization')?.startsWith('Bearer ');
  return Boolean(modern || legacy || bearer);
}
function isStatic(pathname: string) {
  return pathname.startsWith('/_next') ||
         pathname.startsWith('/static') ||
         pathname.startsWith('/favicon') ||
         pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|txt|map)$/i);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // Never guard static assets or the login page itself
  if (isStatic(pathname) || pathname.startsWith('/login')) {
    return NextResponse.next({ headers: debugHeaders('skip:static/login', pathname) });
  }

  // Only guard our protected prefixes
  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ headers: debugHeaders('skip:not-protected', pathname) });
  }

  // Let Supabase finalize sessions (?code=...) before we enforce redirects
  if (hasSupabaseCode(url)) {
    return NextResponse.next({ headers: debugHeaders('allow:code-handshake', pathname) });
  }

  // Enforce auth
  if (!isSignedIn(req)) {
    const login = new URL('/login', url);
    login.searchParams.set('next', pathname + (search || ''));
    const res = NextResponse.redirect(login, { headers: debugHeaders('redirect:login', pathname) });
    return res;
  }

  // Auth OK
  return NextResponse.next({ headers: debugHeaders('allow:authed', pathname) });
}

// Emit easy-to-see headers for debugging in Network panel
function debugHeaders(reason: string, path: string) {
  const h = new Headers();
  h.set('x-guard', reason);
  h.set('x-guard-path', path);
  return h;
}

// Run only where needed
export const config = {
  matcher: PROTECTED.map((p) => `${p}/:path*`),
};
