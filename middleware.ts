// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Supabase sets cookies like: sb-<project-ref>-auth-token
const AUTH_COOKIE_RE = /^sb-[^-]+-auth-token$/;

function hasSupabaseSession(req: NextRequest) {
  for (const c of req.cookies.getAll()) {
    if (AUTH_COOKIE_RE.test(c.name) && c.value && c.value !== 'null' && c.value !== 'undefined') {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const authed = hasSupabaseSession(req);

  // Already signed in → keep users out of /login and /join
  if (authed && (path === '/login' || path.startsWith('/join'))) {
    const to = new URL('/dashboard', req.url);
    return NextResponse.redirect(to);
  }

  // Not signed in → keep /dashboard protected
  if (!authed && path.startsWith('/dashboard')) {
    const to = new URL('/login', req.url);
    return NextResponse.redirect(to);
  }

  return NextResponse.next();
}

// Only run for these routes
export const config = {
  matcher: ['/login', '/join/:path*', '/dashboard/:path*'],
};
