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
  // Let browsers preflight without errors
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ error: 'access_token required' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    // New cookies used by Supabase SSR helpers
    setCookie(res, 'sb-access-token', access_token, 60 * 60);               // 1 hour
    if (typeof refresh_token === 'string' && refresh_token.length > 0) {
      setCookie(res, 'sb-refresh-token', refresh_token, 60 * 60 * 24 * 30); // 30 days
    }

    // Legacy cookie your middleware may still read
    // (your earlier middleware parsed JSON and grabbed .access_token)
    try {
      const legacy = JSON.stringify({
        access_token,
        refresh_token: typeof refresh_token === 'string' ? refresh_token : null,
      });
      setCookie(res, 'supabase-auth-token', legacy, 60 * 60 * 24 * 30);
    } catch {
      // ignore if JSON stringify somehow fails
    }

    return res;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
}
