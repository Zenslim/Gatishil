import { NextResponse } from 'next/server';

function setCookie(
  res: NextResponse,
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function OPTIONS() {
  // Allow CORS preflight when fetch() runs with credentials
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ error: 'access_token required' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    // New canonical Supabase SSR cookies
    setCookie(res, 'sb-access-token', access_token, 60 * 60);               // 1h
    if (typeof refresh_token === 'string' && refresh_token.length > 0) {
      setCookie(res, 'sb-refresh-token', refresh_token, 60 * 60 * 24 * 30); // 30d
    }

    // Legacy cookie (some older middleware/pages still read this JSON)
    try {
      const legacy = JSON.stringify({
        access_token,
        refresh_token: typeof refresh_token === 'string' ? refresh_token : null,
      });
      setCookie(res, 'supabase-auth-token', legacy, 60 * 60 * 24 * 30);
    } catch {}

    return res;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
}
