// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Minimal middleware guard:
 * - Optionally canonicalize GET page requests to the apex host.
 * - Never touches /api routes so sensitive flows like WebAuthn are unaffected.
 */
const ENABLE_HOST_CANON = false;
const CANON_HOST = 'gatishilnepal.org';

function maybeCanonicalRedirect(req: NextRequest): NextResponse | null {
  if (!ENABLE_HOST_CANON) return null;

  const url = new URL(req.url);
  const isGet = req.method === 'GET';
  const isAlreadyCanon = url.host === CANON_HOST;

  if (isGet && !isAlreadyCanon) {
    url.host = CANON_HOST;
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export function middleware(req: NextRequest) {
  const canon = maybeCanonicalRedirect(req);
  if (canon) return canon;
  return NextResponse.next();
}

// 🔒 Never run on /api or static assets.
// This prevents middleware from touching WebAuthn endpoints (/api/webauthn/*).
export const config = {
  matcher: [
    '/((?!api/|_next/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|images/|fonts/|assets/).*)',
  ],
};
