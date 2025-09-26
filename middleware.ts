// middleware.ts — STOP ALL EDGE REDIRECTS (loop-killer)
// Sensei move: no doorman, no arguments. Let pages handle auth + routing.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(_req: NextRequest) {
  return NextResponse.next(); // pass-through
}

// Match nothing — effectively disables middleware.
export const config = { matcher: [] };
