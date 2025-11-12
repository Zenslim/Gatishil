// middleware.ts — Supabase-aware guard for protected routes.
// Verifies/refreshes session cookies on the Edge before deciding access.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

// Single source of truth: protected path prefixes
const PROTECTED = ['/dashboard', '/onboard', '/people'];

// Simple filters
const isStatic = (p: string) =>
  p.startsWith('/_next') ||
  p.startsWith('/static') ||
  p.startsWith('/favicon') ||
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|txt|map|woff2?)$/i.test(p);

const hasSupabaseCode = (url: URL) => url.searchParams.has('code'); // OTP/magic-link/OAuth

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip static assets and the login page itself
  if (isStatic(pathname) || pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Only guard protected paths
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Allow the initial Supabase handshake to reach the route/page
  if (hasSupabaseCode(req.nextUrl)) {
    return NextResponse.next();
  }

  // Create a mutable response; Supabase may rotate cookies into it
  const res = NextResponse.next();

  let supabase;
  try {
    supabase = createMiddlewareClient<Database>({ req, res });
  } catch (error) {
    // Fail open if Supabase env vars are not configured
    return res;
  }

  // Touch auth to both verify and give Supabase a chance to refresh cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', req.nextUrl);
    login.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(login);
  }

  // Important: return the same response so refreshed cookies are sent back
  return res;
}

export const config = {
  matcher: PROTECTED.map((p) => `${p}/:path*`),
};
