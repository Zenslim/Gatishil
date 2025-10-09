// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Canonical apex domain we want every request to resolve to.
const CANONICAL_HOST = 'gatishilnepal.org';
const WWW_HOSTS = new Set(['www.gatishilnepal.org']);

// Lightweight guard to keep /login and /join clean for authed users
const PROTECTED_REDIRECTS = new Set(['/login', '/join']);

export function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const host = url.hostname;

    if (WWW_HOSTS.has(host)) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.hostname = CANONICAL_HOST;
      redirectUrl.protocol = 'https:';
      return NextResponse.redirect(redirectUrl, { status: 308 });
    }

    if (PROTECTED_REDIRECTS.has(url.pathname)) {
      const cookieHeader = req.headers.get('cookie');
      const hasSb = cookieHeader ? cookieHeader.split(';').some((chunk) => chunk.trim().startsWith('sb-')) : false;
      if (hasSb) {
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('middleware error', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/:path*']
};
