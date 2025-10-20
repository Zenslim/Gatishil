// middleware.ts — inert middleware to avoid runtime/auth coupling during builds
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(_req: NextRequest) {
  // Do nothing; just pass the request through.
  return NextResponse.next()
}

/**
 * Matcher set to a path that never occurs so this middleware is effectively disabled.
 * This keeps the file in place (for future guards) but prevents accidental redirects.
 */
export const config = {
  matcher: '/_never_match_this_route',
}

