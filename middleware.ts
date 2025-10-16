import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Minimal session detector for Supabase on the Edge.
 * Reads cookies; does not mutate them (middleware is read-only for cookies).
 */
function hasSupabaseSession(req: NextRequest): boolean {
  // Newer cookie set by @supabase/ssr helpers
  const sb = req.cookies.get("sb-access-token")?.value
  if (sb) return true

  // Legacy GoTrue cookie (JSON with access_token)
  const legacy = req.cookies.get("supabase-auth-token")?.value
  if (!legacy) return false
  try {
    const parsed = JSON.parse(legacy)
    return typeof parsed?.access_token === "string" && parsed.access_token.length > 0
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const { pathname, search } = url

  // (1) Canonicalize host: force apex domain to keep cookies + WebAuthn RP ID aligned
  if (url.hostname === "www.gatishilnepal.org") {
    url.hostname = "gatishilnepal.org"
    return NextResponse.redirect(url, 301)
  }

  // (2) Skip static assets and general APIs (APIs handle auth themselves)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/api") // let routes API-enforce as needed
  ) {
    return NextResponse.next()
  }

  // (3) Public routes — always allowed without a session
  const publicPaths = new Set<string>(["/", "/join", "/login", "/about", "/contact"])
  if (publicPaths.has(pathname)) {
    return NextResponse.next()
  }

  // (4) Require session for onboarding (includes Trust Step: ?step=trust)
  if (pathname === "/onboard") {
    if (!hasSupabaseSession(req)) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/login?next=${next || "/onboard"}`, req.url))
    }
    return NextResponse.next()
  }

  // (5) Protect app areas
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
    if (!hasSupabaseSession(req)) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/login?next=${next || "/dashboard"}`, req.url))
    }
  }

  // (6) Default: allow
  return NextResponse.next()
}

export const config = {
  // Run on all routes so we can canonicalize host; static/assets/api are short-circuited above.
  matcher: "/:path*",
}
