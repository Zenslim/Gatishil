// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type Guard = {
  pattern: RegExp;
  buildRedirect: (req: NextRequest) => URL;
};

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

// Minimal cookie probe; avoid network work in middleware.
function hasSupabaseSession(req: NextRequest): boolean {
  const c = req.cookies;
  return Boolean(
    c.get('sb-access-token')?.value ||
    c.get('sb-refresh-token')?.value ||
    c.get('sb:token')?.value ||
    c.get('supabase-auth-token')?.value
  );
}

export function middleware(req: NextRequest) {
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

  const authed = hasSupabaseSession(req);

  // Never short-circuit /login here. We rely on the page itself to ask Supabase
  // if the cookies are still valid so that stale tokens do not cause loops.

  // Guard only the routes that truly depend on server-visible cookies.
  const guard = PROTECTED.find(({ pattern }) => pattern.test(pathname));
  if (guard && !authed) {
    return NextResponse.redirect(guard.buildRedirect(req));
  }

  return NextResponse.next();
}

// Keep matcher tight so we don't accidentally trap assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|images/|public/).*)'],
};
