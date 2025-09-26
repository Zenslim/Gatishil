// Gatishil Systemic Access Policy (Edge)
// Single source of truth for:
// 1) Canonical domain (no "www", no ".vercel.app")
// 2) Member lifecycle routing (window → interior)
// 3) Deep link return after login without loops
// 4) Robots hygiene (interior rooms are never indexed)
// 5) PWA-friendly: members live in the app shell, not the window

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// --- CONFIG YOU OWN ----------------------------------------------------------
const CANONICAL_HOST = 'gatishilnepal.org';

// “Window-side doors” (visitor space). Signed-in folks shouldn’t linger here.
const POST_AUTH_PATHS = new Set<string>([
  '/',              // window display (homepage)
  '/login',
  '/members',       // legacy path; kept for backward links
  '/welcome',       // first-time checklist container
  '/auth/callback', // OAuth return
  '/onboard',       // any onboarding alias
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

// Optional: public utility routes that should not trigger auth logic.
const PUBLIC_ALLOWLIST_PREFIXES = [
  '/api/health',
  '/status',
  '/manifest.json',
  '/sw.js',
  '/icons/',
  '/favicon.ico',
  '/robots.txt',
];

// -----------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const host = req.headers.get('host') || '';

  // 0) Canonical domain hardening (prevents split identity + weird cookies).
  if (host !== CANONICAL_HOST) {
    const to = new URL(url.toString());
    to.host = CANONICAL_HOST;
    to.protocol = 'https:'; // always upgrade
    return NextResponse.redirect(to, 308);
  }

  // 1) Skip static + known public utility routes quickly.
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/public/') ||
    path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|json|map)$/i) ||
    PUBLIC_ALLOWLIST_PREFIXES.some((p) => path === p || path.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 2) Heuristic session detection via Supabase cookies (GoTrue v2).
  //    We do NOT decode tokens here; just detect presence.
  const hasSession =
    Boolean(req.cookies.get('sb-access-token')?.value) ||
    Boolean(req.cookies.get('sb-refresh-token')?.value) ||
    Boolean(req.cookies.get('supabase-auth-token')?.value);

  // 3) If you're already inside (signed in) and touch any window-door,
  //    we walk you straight to the interior home: /dashboard.
  if (hasSession && POST_AUTH_PATHS.has(path)) {
    const to = url.clone();
    to.pathname = '/dashboard';
    to.search = ''; // drop noisy params on window routes
    const res = NextResponse.redirect(to, 307);
    // Interior should not be indexed.
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res;
  }

  // 4) If you're outside (no session) and try to enter interior rooms,
  //    we send you to /login and preserve your intended destination (“next”).
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/')
  );

  if (!hasSession && isProtected) {
    const to = url.clone();
    to.pathname = '/login';

    // If we already came from /login → avoid redirect ping-pong.
    const alreadyAtLogin = path === '/login';
    if (!alreadyAtLogin) {
      to.searchParams.set('next', path);
      // Preserve query for true deep links (e.g., /projects/123?tab=votes)
      if (url.search) to.searchParams.set('q', url.search);
    }

    const res = NextResponse.redirect(to, 307);
    // Login may be indexed, but not user-specific deep links.
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // 5) Robots hygiene: interior rooms should never be indexed,
  //    even on direct hits or share links.
  const res = NextResponse.next();
  if (isProtected) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // 6) Thought-provoking, enforced policies as headers (not just words):
  //    - Dignity-First: members don’t get shoved back to the window.
  //    - No-Wall-of-Text: keep payloads lean for slow networks.
  //    - Consentful Deep Link: we return the exact room you wanted, no traps.
  res.headers.set('Cache-Control', 'no-store'); // avoid stale auth UIs
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

// Apply to “everything except assets”
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|robots.txt|.*\\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|json|map)).*)',
  ],
};
