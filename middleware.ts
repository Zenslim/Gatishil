import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function resolveAccessToken(req: NextRequest): string | null {
  const sb = req.cookies.get('sb-access-token')?.value;
  if (sb) return sb;

  const legacy = req.cookies.get('supabase-auth-token')?.value;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const token = parsed?.access_token;
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
    } catch (error) {
      console.error('[middleware] failed to parse supabase-auth-token', error);
    }
  }

  return null;
}

const PROTECTED_PATHS = ['/dashboard'];
const AUTH_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: '',
      path: '/',
      expires: new Date(0),
    });
  }
}

export async function middleware(req: NextRequest) {
  const hostname = req.nextUrl.hostname.toLowerCase();
  if (hostname === 'www.gatishilnepal.org') {
    const url = req.nextUrl.clone();
    url.hostname = 'gatishilnepal.org';
    return NextResponse.redirect(url, 301);
  }

  if (req.nextUrl.pathname.startsWith('/api/webauthn/')) {
    const res = NextResponse.next();
    const token = resolveAccessToken(req);
    if (token) {
      res.headers.set('Authorization', `Bearer ${token}`);
    }
    return res;
  }

  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

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

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', req.nextUrl);
    const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    loginUrl.searchParams.set('next', nextPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    clearAuthCookies(redirectResponse);
    return redirectResponse;
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif)|favicon\\.ico).*)',
    '/api/webauthn/:path*',
  ],
};
