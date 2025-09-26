// Gatishil — Minimal, Loop-Safe Edge Policy
// Purpose: stop redirect loops by doing ONLY post-auth uplift + (prod) canonical host.
// All "protected route" enforcement is handled in server pages, not at the Edge.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ---------- CONFIG ----------
const CANONICAL_HOST = 'gatishilnepal.org'; // prod apex

// Visitor (window) pages — signed-in users shouldn’t linger here.
const POST_AUTH_PATHS = new Set<string>([
  '/',              // window display (homepage)
  '/login',
  '/members',       // legacy
  '/welcome',
  '/onboard',
  '/auth/callback', // OAuth return
]);

// Public utility that should bypass logic fast.
const PUBLIC_ALLOWLIST_PREFIXES = [
  '/api/health',
  '/status',
  '/manifest.json',
  '/sw.js',
  '/icons/',
  '/favicon.ico',
  '/robots.txt',
];

// ---------- HELPERS ----------
function isSkippablePath(path: string): boolean {
  if (path.startsWith('/_next/') || path.startsWith('/public/')) return true;
  if (PUBLIC_ALLOWLIST_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
  // any file-like path with an extension
  if (/\.[^/]+$/.test(path)) return true;
  return false;
}

// Robust Supabase session cookie detection (GoTrue v2 + legacy)
function hasSupabaseSessionCookie(req: NextRequest): boolean {
  const names = req.cookies.getAll().map((c) => c.name);
  const v2 = names.some((n) => /^sb-[a-z0-9]+-[a-z0-9]+-auth-token$/i.test(n));
  const legacy =
    names.includes('supabase-auth-token') ||
    names.includes('sb-access-token') ||
    names.includes('sb-refresh-token');
  return v2 || legacy;
}

// ---------- MIDDLEWARE ----------
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
    return NextResponse.redirect(to, 308);
  }

  const hasSession = hasSupabaseSessionCookie(req);

  // 1) LOOP-SAFE: never redirect while on /login itself.
  if (path === '/login') return NextResponse.next();

  // 2) POST-AUTH UPLIFT ONLY:
  // If signed in and touching any visitor page, go to the interior home.
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

  // 3) Everything else: let server pages enforce auth. No Edge blocking.
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

// Build-safe matcher (no capturing groups).
export const config = {
  matcher: [
    '/((?!_next/|public/|icons/|manifest.json|sw.js|robots.txt|favicon.ico|api/health|status|.*\\..*).*)',
  ],
};
