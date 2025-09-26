// Gatishil — Systemic Access Policy (Edge, loop-safe)
// Fixes ERR_TOO_MANY_REDIRECTS by:
//  • Robust Supabase cookie detection (GoTrue v2 patterns)
//  • No redirects on /login itself (ever)
//  • No canonical flips outside prod; no flip-flop between hosts
//  • Safer matcher and extension skip without capture groups

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ===== CONFIG YOU OWN =========================================================
const CANONICAL_HOST = 'gatishilnepal.org'; // apex host you serve in prod

// “Window-side doors” (visitor space). Signed-in folks shouldn’t linger here.
const POST_AUTH_PATHS = new Set<string>([
  '/',              // window display (homepage)
  '/login',         // BUT: never redirect while already on /login (guard below)
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

// Public utility routes that should bypass auth logic quickly.
const PUBLIC_ALLOWLIST_PREFIXES = [
  '/api/health',
  '/status',
  '/manifest.json',
  '/sw.js',
  '/icons/',
  '/favicon.ico',
  '/robots.txt',
];
// =============================================================================

// Robust Supabase session cookie detection (GoTrue v2 and variants)
function hasSupabaseSessionCookie(req: NextRequest): boolean {
  const all = req.cookies.getAll().map((c) => c.name);
  // v2 “array cookie” name like: sb-<project-ref>-auth-token
  const v2 = all.some((n) => /^sb-[a-z0-9]+-[a-z0-9]+-auth-token$/i.test(n));
  // older/SDK variants we still honour
  const legacy =
    all.includes('supabase-auth-token') ||
    all.includes('sb-access-token') ||
    all.includes('sb-refresh-token');
  return v2 || legacy;
}

// Build-safe: skip static assets and public files.
function isSkippablePath(path: string): boolean {
  if (path.startsWith('/_next/') || path.startsWith('/public/')) return true;
  if (PUBLIC_ALLOWLIST_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
  // Any "file-like" path with an extension: /x/y.ext
  if (/\.[^/]+$/.test(path)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  // 0) Canonical host only in production; allow localhost and *.vercel.app
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || 'development';
  const isProd = env === 'production';
  const isLocal = host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
  const isVercelPreview = host.endsWith('.vercel.app');

  if (isSkippablePath(path)) return NextResponse.next();

  if (isProd && !isLocal && !isVercelPreview && host !== CANONICAL_HOST) {
    const to = new URL(url.toString());
    to.protocol = 'https:';
    to.host = CANONICAL_HOST;
    return NextResponse.redirect(to, 308); // one-way, no flip-flop
  }

  const hasSession = hasSupabaseSessionCookie(req);

  // 1) Never redirect while already on /login (prevents ping-pong)
  if (path === '/login') {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 2) If signed in and touching a window-door → home inside
  if (hasSession && POST_AUTH_PATHS.has(path)) {
    const to = url.clone();
    to.pathname = '/dashboard';
    to.search = '';
    const res = NextResponse.redirect(to, 307);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 3) If outside and trying to enter interior → go to login with return path
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/')
  );

  if (!hasSession && isProtected) {
    const to = url.clone();
    to.pathname = '/login';
    to.searchParams.set('next', path);
    if (url.search) to.searchParams.set('q', url.search); // preserve query if any
    const res = NextResponse.redirect(to, 307);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
  }

  // 4) Robots hygiene for any direct interior hit
  const res = NextResponse.next();
  if (isProtected) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

// Build-safe matcher: no capturing groups.
export const config = {
  matcher: [
    '/((?!_next/|public/|icons/|manifest.json|sw.js|robots.txt|favicon.ico|api/health|status|.*\\..*).*)',
  ],
};
