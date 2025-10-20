// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

type Guard = {
  pattern: RegExp;
  buildRedirect: (req: NextRequest) => URL;
};

const SESSION_COOKIES = [
  'sb-access-token',
  'sb-refresh-token',
  'sb:token',
  'supabase-auth-token',
];

// Only guard routes that truly require server-visible cookies.
const PROTECTED: Guard[] = [
  {
    pattern: /^\/dashboard(?:\/|$)/,
    buildRedirect: (req) => {
      const url = new URL('/login', req.url);
      const next = req.nextUrl.pathname + req.nextUrl.search;
      url.searchParams.set('next', next || '/dashboard');
      return url;
    },
  },
  {
    pattern: /^\/onboard(?:\/|$)/,
    buildRedirect: (req) => new URL('/join', req.url),
  },
  {
    pattern: /^\/security(?:\/|$)/,
    buildRedirect: (req) => {
      const url = new URL('/login', req.url);
      const next = req.nextUrl.pathname + req.nextUrl.search;
      url.searchParams.set('next', next || '/security');
      return url;
    },
  },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets & Next internals & API.
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Guard only the routes that truly depend on server-visible cookies.
  const guard = PROTECTED.find(({ pattern }) => pattern.test(pathname));
  if (!guard) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session && !error) {
    return res;
  }

  const redirectResponse = NextResponse.redirect(guard.buildRedirect(req));

  // Clear known Supabase session cookies so the login page starts fresh and
  // avoids redirect loops caused by stale tokens.
  for (const name of SESSION_COOKIES) {
    redirectResponse.cookies.set({
      name,
      value: '',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
    });
  }

  return redirectResponse;
}

// Keep matcher tight so we don't accidentally trap assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|images/|public/).*)'],
};
