import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Extract an access token from Supabase cookies (supports legacy key) */
function resolveAccessToken(req: NextRequest): string | null {
  const sb = req.cookies.get('sb-access-token')?.value;
  if (sb) return sb;

  const legacy = req.cookies.get('supabase-auth-token')?.value;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const token = parsed?.access_token;
      if (typeof token === 'string' && token.length > 0) return token;
    } catch (error) {
      console.error('[middleware] failed to parse supabase-auth-token', error);
    }
  }
  return null;
}

const PROTECTED_PATHS = ['/dashboard'];
const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isPublicPath = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/login') ||
  pathname.startsWith('/join') ||
  pathname.startsWith('/onboard') ||
  pathname.startsWith('/_next') ||
  pathname.startsWith('/assets') ||
  pathname.startsWith('/images') ||
  pathname.startsWith('/favicon') ||
  pathname === '/robots.txt' ||
  pathname === '/sitemap.xml';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 0) Host normalization (once): force apex so auth cookies match origin.
  if (url.hostname.toLowerCase() === 'www.gatishilnepal.org') {
    url.hostname = 'gatishilnepal.org';
    return NextResponse.redirect(url, 308);
  }

  const pathname = url.pathname;

  // 1) WebAuthn API: always reachable (forward token if present)
  if (pathname.startsWith('/api/webauthn/')) {
    const res = NextResponse.next();
    const token = resolveAccessToken(req);
    if (token) res.headers.set('Authorization', `Bearer ${token}`);
    res.headers.set('X-MW-Stage', 'webauthn-pass');
    return res;
  }

  // 2) Public pages/static assets: NEVER redirect (prevents loops)
  if (isPublicPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set('X-MW-Stage', 'public-pass');
    return res;
  }

  // 3) Protect ONLY /dashboard
  if (isProtectedPath(pathname)) {
    const res = NextResponse.next(); // allow Supabase to update cookies if needed

    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Build relative /login on SAME origin; preserve next safely.
      const loginUrl = new URL('/login', url);
      const nextTarget = url.pathname + (url.search || '');

      // 3a) Self-redirect guard: never redirect to the same URL.
      if (loginUrl.origin + loginUrl.pathname + (loginUrl.search || '') === url.origin + url.pathname + (url.search || '')) {
        const passthrough = NextResponse.next();
        passthrough.headers.set('X-MW-Stage', 'self-redirect-guard');
        return passthrough;
      }

      // 3b) Avoid loops: don't set next if we're already on /login
      if (!nextTarget.startsWith('/login')) {
        loginUrl.searchParams.set('next', nextTarget);
      }

      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.headers.set('X-MW-Stage', 'to-login');
      return redirectRes;
    }

    res.headers.set('X-MW-Stage', 'protected-pass');
    return res;
  }

  // 4) Default allow
  const res = NextResponse.next();
  res.headers.set('X-MW-Stage', 'default-pass');
  return res;
}

export const config = {
  matcher: [
    // Run on everything except Next static/image and favicon; we still explicitly allowlist inside.
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Ensure our WebAuthn passthrough always runs here too
    '/api/webauthn/:path*',
  ],
};
