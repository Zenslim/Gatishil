// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Canonical apex domain we want every request to resolve to.
const CANONICAL_HOST = 'gatishilnepal.org';
const WWW_HOSTS = new Set(['www.gatishilnepal.org']);

// Lightweight guard to keep /login and /join clean for authed users
const PROTECTED_REDIRECTS = new Set(['/login', '/join']);

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = base64 + padding;
  if (typeof atob === 'function') {
    return atob(normalized);
  }
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function hasValidSupabaseSession(req: NextRequest) {
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const refreshToken = req.cookies.get('sb-refresh-token')?.value;
  if (!accessToken || !refreshToken) {
    return false;
  }

  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return false;
    const decoded = base64UrlDecode(payload);
    const data = JSON.parse(decoded);
    const exp = typeof data?.exp === 'number' ? data.exp : null;
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    // Give ourselves a tiny grace window so nearly-expired tokens don't loop
    return exp > now + 30;
  } catch (err) {
    console.error('Failed to parse Supabase session token', err);
    return false;
  }
}

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
      if (hasValidSupabaseSession(req)) {
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
