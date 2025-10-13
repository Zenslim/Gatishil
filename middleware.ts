import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.cookies.get('sb-access-token')?.value;
  if (token && req.nextUrl.pathname.startsWith('/api/webauthn/')) {
    res.headers.set('Authorization', `Bearer ${token}`);
  }
  return res;
}

export const config = {
  matcher: ['/api/webauthn/:path*'],
};
