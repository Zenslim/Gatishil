// Gatishil Systemic Access Policy (Edge)
//
// • Canonical host (production only), but allow localhost & *.vercel.app previews
// • Window (visitor) vs Interior (member) routing
// • Deep-link return via ?next= (no loops)
// • Robots hygiene for interior rooms
// • Matcher fixed: no capturing groups (build-safe for Next.js 14)

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ---- CONFIG YOU OWN ---------------------------------------------------------
const CANONICAL_HOST = 'gatishilnepal.org'; // production host

// “Window-side doors” (visitor space). Signed-in folks shouldn’t linger here.
const POST_AUTH_PATHS = new Set<string>([
  '/',              // window display (homepage)
  '/login',
  '/members',       // legacy link, kept for backward compatibility
  '/welcome',       // first-time checklist
  '/auth/callback', // OAuth return
  '/onboard',       // onboarding alias
]);

// “Interior rooms” (member space).
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/security',
  '/orgs',
  '/people',
  '/projects',
  '/money',
  '/knowledge',
  '/polls',
  '/proposals',
];

// Public utility routes that should bypass auth logic.
const PUBLIC_ALLOWLIST_PREFIXES = [
  '/api/health',
  '/status',
  '/manifest.json',
  '/sw.js',
  '/icons/',
  '/favicon.ico',
  '/robots.txt',
];
// ----------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  // 0) Canonical host — but permit localhost and Vercel preview hosts.
  const isLocal = host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
  const isVercelPreview = host.endsWith('.vercel.app');
  if (!isLocal && !isVercelPreview && host !== CANONICAL_HOST) {
    const to = new URL(url.toString());
    to.protocol = 'https:';
    to.host = CANONICAL_HOST;
    // 308 keeps method, good for OAuth callbacks too.
    return NextResponse.redirect(to, 308);
  }

  // 1) Skip static & public utility quickly.
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/public/') ||
    // skip any file with an extension (no capturing groups)
    /\.[^/]+$/.test(path) ||
    PUBLIC_ALLOWLIST_PREFIXES.some((p) => path === p || path.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 2) Heuristic session detection via Supabase cookies (GoTrue v2 patterns).
  const hasSession =
    Boolean(req.cookies.get('sb-access-token')?.value) ||
    Boolean(req.cookies.get('sb-refresh-token')?.value) ||
    Boolean(req.cookies.get('supabase-auth-token')?.value);

  // 3) Already inside + touching window-door → go to interior home.
  if (hasSession && POST_AUTH_PATHS.has(path)) {
    const to = url.clone();
    to.pathname = '/dashboard';
    to.search = ''; // drop noisy params from window routes
    const res = NextResponse.redirect(to, 307);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 4) Outside + trying to enter interior rooms → go to login with return path.
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/')
  );

  if (!hasSession && isProtected) {
    const to = url.clone();
    to.pathname = '/login';
    // avoid ping-pong: only add next if not already on /login
    if (path !== '/login') {
      to.searchParams.set('next', path);
      if (url.search) to.searchParams.set('q', url.search); // preserve query
    }
    const res = NextResponse.redirect(to, 307);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 5) Robots hygiene for any direct interior hit (signed-in or not).
  const res = NextResponse.next();
  if (isProtected) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

// Build-safe matcher: no capturing groups.
// Skips Next static, any file with extension, icons, PWA assets, robots.
export const config = {
  matcher: [
    '/((?!_next/|public/|icons/|manifest.json|sw.js|robots.txt|favicon.ico|api/health|status|.*\\..*).*)',
  ],
};
