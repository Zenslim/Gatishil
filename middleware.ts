// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// We no longer guard /dashboard in middleware because client-side sessions
// (localStorage) are invisible to the server at this point and cause false negatives.
// The dashboard page itself performs a server-side getUser() and redirects cleanly.
// Keep only truly sensitive routes that you KNOW require cookies visible to the server.
const PROTECTED: RegExp[] = [
  /^\/security(?:\/|$)/,
  // add others later only if they rely on server-visible cookies/tokens
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
  const { pathname, searchParams } = req.nextUrl;

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
  if (PROTECTED.some((re) => re.test(pathname)) && !authed) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Keep matcher tight so we don't accidentally trap assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|images/|public/).*)'],
};
