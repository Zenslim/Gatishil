// middleware.ts
import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function isPublicPath(pathname: string) {
  // Public pages that must NEVER be intercepted or rewritten
  const publicMatchers = [
    /^\/$/,                       // home
    /^\/join$/,                   // join page (magic link / OTP entrypoint)
    /^\/onboard(?:\/.*)?$/,       // onboarding flow
    /^\/login$/,                  // explicit login
    /^\/logout$/,                 // explicit logout
    /^\/verify(?:\/.*)?$/,        // email verification / expired-link pages
    /^\/api\/.*$/,                // all API routes
    /^\/_next\/.*$/,              // next.js internals
    /^\/favicon\.ico$/,           // assets
    /^\/images\/.*$/,             // assets
    /^\/assets\/.*$/,             // assets
  ];
  return publicMatchers.some((re) => re.test(pathname));
}

function isProtectedPath(pathname: string) {
  // Only protect your private app areas. Keep this list tight.
  const protectedMatchers = [
    /^\/dashboard(?:\/.*)?$/,
    /^\/console(?:\/.*)?$/,
    /^\/settings(?:\/.*)?$/,
    /^\/security(?:\/.*)?$/,
    /^\/proposals(?:\/.*)?$/,
    /^\/polls(?:\/.*)?$/,
  ];
  return protectedMatchers.some((re) => re.test(pathname));
}

export async function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // 1) Never touch public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2) If path isn’t protected, just pass through
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // 3) For protected paths, require a Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookies.get(name)?.value } }
  );

  const { data, error } = await supabase.auth.getUser();

  // If we can’t read a session or there’s no user, send to login (NOT chautara)
  if (error || !data?.user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname + (nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  // 4) Session present → allow
  return NextResponse.next();
}

// Only run middleware where it’s needed: avoid matching /join, /onboard, etc.
export const config = {
  matcher: [
    // We let the function logic decide, but keeping matcher broad is fine.
    // The allowlist above ensures /join and /onboard are never intercepted.
    '/((?!_next|favicon.ico|images|assets).*)',
  ],
};
