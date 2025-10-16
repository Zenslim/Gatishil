import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSupabaseSession(req: NextRequest): boolean {
  const sb = req.cookies.get("sb-access-token")?.value;
  if (sb) return true;

  const legacy = req.cookies.get("supabase-auth-token")?.value;
  if (!legacy) return false;
  try {
    const parsed = JSON.parse(legacy);
    return typeof parsed?.access_token === "string" && parsed.access_token.length > 0;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Allow static assets and auth callbacks freely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/webauthn")
  ) {
    return NextResponse.next();
  }

  // ONLY guard dashboard/settings (keep /onboard and /join open pre-login)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
    if (!hasSupabaseSession(req)) {
      const next = encodeURIComponent(pathname + search);
      return NextResponse.redirect(new URL(`/login?next=${next}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
