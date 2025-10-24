import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/dashboard', '/onboard', '/people']
};

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  // Allow Supabase auth callbacks and any request that carries a 'code' param
  if (nextUrl.pathname.startsWith('/auth') || nextUrl.searchParams.has('code')) {
    return NextResponse.next();
  }

  const hasAccess = cookies.get('sb-access-token') || cookies.get('sb-refresh-token');
  const protectedPaths = (config.matcher as string[]);
  const isProtected = protectedPaths.some((p) => nextUrl.pathname.startsWith(p));

  if (isProtected && !hasAccess) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
