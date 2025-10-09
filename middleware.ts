// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Lightweight guard to keep /login and /join clean for authed users
const PROTECTED_REDIRECTS = new Set(['/login', '/join']);
export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  if (PROTECTED_REDIRECTS.has(url.pathname)) {
    // Heuristic: Supabase sets at least one sb- cookie when logged in
    const hasSb = Array.from(req.cookies.getAll()).some(c => c.name.startsWith('sb-'));
    if (hasSb) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/join']
};
