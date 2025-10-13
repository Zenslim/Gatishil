// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware responsibilities:
 * 1) (Optional) Canonicalize page requests to a chosen host (kept disabled).
 * 2) For /api/webauthn/*, forward Supabase sb-access-token cookie as Authorization header,
 *    so Edge Route Handlers can always identify the user.
 */
const ENABLE_HOST_CANON = false;
const CANON_HOST = 'gatishilnepal.org'; // unused while canon is disabled

function maybeCanonicalRedirect(req: NextRequest): NextResponse | null {
  if (!ENABLE_HOST_CANON) return null;
  const url = req.nextUrl.clone();
  const host = url.hostname.toLowerCase();
  if (host !== CANON_HOST && req.method === 'GET' && !url.pathname.startsWith('/api/')) {
    url.hostname = CANON_HOST;
    return NextResponse.redirect(url, 307);
  }
  return null;
}

export function middleware(req: NextRequest) {
  // If you later enable canonicalization, keep API untouched.
  if (!req.nextUrl.pathname.startsWith('/api/webauthn/')) {
    const canon = maybeCanonicalRedirect(req);
    if (canon) return canon;
    return NextResponse.next();
  }

  // 🔐 For /api/webauthn/*: forward Supabase access token to Authorization header
  const access = req.cookies.get('sb-access-token')?.value;
  const requestHeaders = new Headers(req.headers);

  if (access) {
    requestHeaders.set('Authorization', `Bearer ${access}`);
  }

  // Pass modified headers to the downstream Edge/Node handler
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Run on WebAuthn API + normal pages (exclude static assets/_next by pattern)
export const config = {
  matcher: [
    '/api/webauthn/:path*',
    '/((?!_next/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|images/|fonts/|assets/).*)',
  ],
};
