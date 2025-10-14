export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const jar = cookies();
  jar.set({
    name,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

function decodeJwtExp(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const exp = Number(json?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const access_token: string | null = body?.access_token ?? null;
    const refresh_token: string | null = body?.refresh_token ?? null;

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access token' }, { status: 400 });
    }

    const exp = decodeJwtExp(access_token);
    const now = Math.floor(Date.now() / 1000);
    const maxAgeAccess = exp && exp > now ? exp - now : 3600;
    const maxAgeRefresh = 60 * 60 * 24 * 7;

    setCookie('sb-access-token', access_token, maxAgeAccess);
    if (refresh_token) setCookie('sb-refresh-token', refresh_token, maxAgeRefresh);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[auth/sync] error:', err);
    return NextResponse.json({ ok: false, error: 'Sync failed', detail: String(err?.message || err) }, { status: 500 });
  }
}