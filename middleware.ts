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
function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/onboard') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 0) Host normalization (once): force apex so auth cookies match origin.
  if (url.hostname.toLowerCase() === 'www.gatishilnepal.org') {
    url.hostname = 'gatishilnepal.org';
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = url;

  // 1) WebAuthn API must always be reachable (and carry token if present)
  if (pathname.startsWith('/api/webauthn/')) {
    const res = NextResponse.next();
    const token = resolveAccessToken(req);
    if (token) res.headers.set('Authorization', `Bearer ${token}`);
    return res;
  }

  // 2) Public pages and static assets pass through untouched (prevents loops)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 3) Protect ONLY the dashboard
  if (isProtectedPath(pathname)) {
    const res = NextResponse.next(); // for cookie writes if Supabase updates them

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
      // Build relative /login on SAME origin; preserve next safely (avoid self-redirects)
      const loginUrl = new URL('/login', url);
      const nextTarget = url.pathname + (url.search || '');
      if (!nextTarget.startsWith('/login')) {
        loginUrl.searchParams.set('next', nextTarget);
      }
      return NextResponse.redirect(loginUrl);
    }

    return res;
  }

  // 4) Default allow for everything else
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next static/image and favicon; we still explicitly allowlist inside.
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Ensure our WebAuthn passthrough always runs here too
    '/api/webauthn/:path*',
  ],
};
