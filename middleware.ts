import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ⚠️ This middleware NEVER redirects or rewrites.
// It only refreshes Supabase cookies so server components (e.g., /dashboard)
// can see an up-to-date session. That makes it loop-proof.

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Skip static and obvious non-HTML assets early (cheap exit).
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  // Prepare a pass-through response. We only add cookies to it.
  const res = NextResponse.next();

  // Compute a safe cookie domain:
  // - On production apex/www, use a shared domain for both hosts.
  // - On previews (vercel.app) or localhost, omit domain so the browser accepts it.
  const hostname = url.hostname || '';
  const cookieDomain =
    hostname.endsWith('gatishilnepal.org') ? '.gatishilnepal.org' : undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: any) => {
          // Write robust cookies without triggering redirects.
          res.cookies.set({
            name,
            value,
            // Only set domain on production so previews/localhost work.
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            ...options,
          });
        },
        remove: (name: string, options?: any) => {
          res.cookies.set({
            name,
            value: '',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            expires: new Date(0),
            ...options,
          });
        },
      },
    }
  );

  // Touch the session (refresh tokens when needed); never throw or redirect.
  try {
    await supabase.auth.getSession();
  } catch {
    // Swallow errors; public pages must not break.
  }

  return res;
}

// Keep this matcher narrow enough to avoid static, but broad for pages.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/|images/).*)',
  ],
};
