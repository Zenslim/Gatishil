import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function resolveAccessToken(req: NextRequest): string | null {
  const sb = req.cookies.get('sb-access-token')?.value;
  if (sb) return sb;

  const legacy = req.cookies.get('supabase-auth-token')?.value;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const token = parsed?.access_token;
      if (typeof token === 'string' && token.length > 0) {
        return token;
      }
    } catch (error) {
      console.error('[middleware] failed to parse supabase-auth-token', error);
    }
  }

  return null;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/webauthn/')) {
    const token = resolveAccessToken(req);
    if (token) {
      res.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return res;
}

export const config = {
  matcher: ['/api/webauthn/:path*'],
};
