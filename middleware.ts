// middleware.ts — redirect unauthenticated users on protected paths,
// but allow Supabase `?code=` onboarding links to establish a session first.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// 1) Single source of truth: list protected path prefixes
const PROTECTED: string[] = ['/dashboard', '/onboard', '/people'];

/** Detect signed-in state from Supabase cookies (modern and legacy) */
function isSignedIn(req: NextRequest): boolean {
  const modern = req.cookies.get('sb-access-token')?.value;   // modern
  const legacy = req.cookies.get('sb:token')?.value;          // legacy (auth-helpers <1.0)
  // Some setups also mirror the token in Authorization; keep cookie check as primary
  const bearer = req.headers.get('authorization')?.startsWith('Bearer ');
  return Boolean(modern || legacy || bearer);
}

/** Allow magic-link/OTP/OAuth callbacks carrying `?code=` to pass */
function hasSupabaseCode(url: URL): boolean {
  // Supabase sends `?code=...` (and sometimes `?next=...`) to your site
  return url.searchParams.has('code');
}

/** Should middleware guard this path? */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // Skip: not a protected path (extra safety; matcher already narrows this)
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Skip: Supabase is redirecting back with `?code=...` to finalize a session
  if (hasSupabaseCode(url)) {
    return NextResponse.next();
  }

  // Skip: already on login route
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // If unauthenticated, redirect to /login with return path
  if (!isSignedIn(req)) {
    const loginUrl = new URL('/login', url);
    // Preserve original path + query so we can land the user back exactly there
    const destination = pathname + (search || '');
    loginUrl.searchParams.set('next', destination);
    return NextResponse.redirect(loginUrl);
  }

  // Otherwise let it through
  return NextResponse.next();
}

// 3) Run middleware only where needed: derive matcher from PROTECTED
export const config = {
  matcher: PROTECTED.map((p) => `${p}/:path*`),
};
