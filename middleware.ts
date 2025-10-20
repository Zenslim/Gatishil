// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Only guard truly protected routes.
// Add more guarded routes here if needed.
const PROTECTED = [/^\/dashboard(?:\/|$)/, /^\/security(?:\/|$)/];

// Supabase helpers set httpOnly cookies. Depending on setup, names can vary.
// We check the common ones *without* doing any network call in middleware.
function hasSupabaseSession(req: NextRequest): boolean {
  const c = req.cookies;
  return Boolean(
    c.get('sb-access-token')?.value ||            // Supabase helpers (standard)
    c.get('sb-refresh-token')?.value ||           // Supabase helpers (standard)
    c.get('sb:token')?.value ||                   // Some older setups
    c.get('supabase-auth-token')?.value           // Rare custom setups
  );
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Never run auth logic on static, Next internals, or public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/api')      // API routes are handled by their own RLS/policies
  ) {
    return NextResponse.next();
  }

  const authed = hasSupabaseSession(req);

  // If the user hits /login but already has a session, send them to their console
  if (pathname === '/login' && authed) {
    const nextParam = searchParams.get('next') || '/dashboard';
    const url = new URL(nextParam, req.url);
    return NextResponse.redirect(url);
  }

  // If the user hits a PROTECTED route without a session, bounce to login with next=
  if (PROTECTED.some((re) => re.test(pathname)) && !authed) {
    const url = new URL('/login', req.url);
    // preserve the original path (and its query) so we can return after login
    url.searchParams.set('next', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  // Otherwise, let it through.
  return NextResponse.next();
}

// Match everything except static/asset routes (cheap prefilter)
// Keep this tight to avoid accidental matches that cause loops.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|images/|public/).*)'],
};
