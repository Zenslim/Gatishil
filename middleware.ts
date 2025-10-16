import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Minimal read-only session detector for Supabase.
 * Works in Edge middleware by checking known cookies.
 */
function hasSupabaseSession(req: NextRequest): boolean {
  // Newer cookie set by @supabase/ssr helpers
  const sb = req.cookies.get("sb-access-token")?.value
  if (sb) return true

  // Legacy GoTrue cookie (JSON string containing access_token)
  const legacy = req.cookies.get("supabase-auth-token")?.value
  if (!legacy) return false
  try {
    const parsed = JSON.parse(legacy)
    return typeof parsed?.access_token === "string" && parsed.access_token.length > 0
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const { pathname, search } = url

  // Public safety: never interfere with the login page itself.
  if (pathname === "/login") return NextResponse.next()

  // 1) Gate /onboard (includes Trust Step via ?step=trust)
  if (pathname === "/onboard") {
    if (!hasSupabaseSession(req)) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/login?next=${next || "/onboard"}`, req.url))
    }
    return NextResponse.next()
  }

  // 2) Gate primary app areas
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
    if (!hasSupabaseSession(req)) {
      const next = encodeURIComponent(pathname + search)
      return NextResponse.redirect(new URL(`/login?next=${next || "/dashboard"}`, req.url))
    }
  }

  // Default allow
  return NextResponse.next()
}

/**
 * Very narrow matcher to avoid accidental loops.
 * We only run on the pages that actually need auth gating.
 */
export const config = {
  matcher: ["/onboard", "/dashboard/:path*", "/settings/:path*"],
}
