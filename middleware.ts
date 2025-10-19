import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Make this middleware minimal: only gate /dashboard if absolutely no session cookie is present.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never touch API auth sync or static files
  if (pathname.startsWith('/api/auth/sync') || pathname.startsWith('/_next') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  // Allow public routes
  const publicPrefixes = ['/join', '/verify', '/onboard', '/login', '/health', '/otp'];
  if (publicPrefixes.some(p => pathname.startsWith(p)) || pathname === '/' ) {
    return NextResponse.next();
  }

  // Only protect /dashboard (you can add more private prefixes here)
  const needsAuth = pathname.startsWith('/dashboard');

  if (!needsAuth) return NextResponse.next();

  // Accept either modern or legacy cookie formats
  const sb = req.cookies.get('sb-access-token')?.value;
  const legacy = req.cookies.get('supabase-auth-token')?.value;

  const hasLegacyToken = (() => {
    if (!legacy) return false;
    try {
      const parsed = JSON.parse(legacy);
      return typeof parsed?.access_token === 'string' && parsed.access_token.length > 0;
    } catch {
      return false;
    }
  })();

  const hasSession = Boolean(sb) || hasLegacyToken;

  if (hasSession) {
    return NextResponse.next();
  }

  // No session → redirect to login with next param
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + (req.nextUrl.search || ''))}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except static assets; we also early-return in code above
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
