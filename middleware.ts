import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function decodeAccess(token: string | undefined) {
  if (!token) return { valid: false, expired: false };
  try {
    const [, payload] = token.split('.');
    if (!payload) return { valid: true, expired: false };
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      Array.from(atob(normalized))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    const json = JSON.parse(decoded);
    if (typeof json?.exp === 'number') {
      const expired = json.exp * 1000 <= Date.now();
      return { valid: !expired, expired };
    }
    return { valid: true, expired: false };
  } catch {
    return { valid: true, expired: false };
  }
}

function readSessionState(req: NextRequest) {
  const direct = req.cookies.get('sb-access-token')?.value || undefined;
  if (direct) {
    return decodeAccess(direct);
  }

  const legacy = req.cookies.get('supabase-auth-token')?.value;
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (typeof parsed?.access_token === 'string') {
        return decodeAccess(parsed.access_token);
      }
    } catch {
      return { valid: false, expired: false };
    }
  }

  return { valid: false, expired: false };
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  const isOnboard = pathname.startsWith('/onboard');
  const isDashboard = pathname.startsWith('/dashboard');

  if (!isOnboard && !isDashboard) {
    return NextResponse.next();
  }

  const { valid, expired } = readSessionState(req);

  if (!valid) {
    if (isOnboard) {
      const url = req.nextUrl.clone();
      url.pathname = '/join';
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (isDashboard) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent('/dashboard' + (search || ''))}`;
      return NextResponse.redirect(url);
    }
  }

  if (isDashboard && expired) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent('/dashboard' + (search || ''))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
