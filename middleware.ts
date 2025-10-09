// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Canonical apex domain we want every request to resolve to.
const CANONICAL_HOST = 'gatishilnepal.org';
const WWW_HOSTS = new Set(['www.gatishilnepal.org']);

// Lightweight guard to keep /login and /join clean for authed users
const PROTECTED_REDIRECTS = new Set(['/login', '/join']);

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostHeader = req.headers.get('host') ?? '';
  const host = hostHeader.split(':')[0];

  if (WWW_HOSTS.has(host)) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = CANONICAL_HOST;
    redirectUrl.protocol = 'https:';
    return NextResponse.redirect(redirectUrl, { status: 308 });
  }

  if (PROTECTED_REDIRECTS.has(url.pathname)) {
    // Heuristic: Supabase sets at least one sb- cookie when logged in
    const hasSb = Array.from(req.cookies.getAll()).some((c) => c.name.startsWith('sb-'));
    if (hasSb) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*']
};
