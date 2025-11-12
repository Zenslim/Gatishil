// app/api/auth/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/auth/sync
 * Returns { authenticated } by reading server cookies.
 */
export async function GET() {
  const supabase = supabaseServer();

  const { data } = await supabase.auth.getUser();
  return NextResponse.json({ authenticated: !!data?.user }, { status: 200 });
}

/**
 * POST /api/auth/sync
 * Accepts tokens from client (after OTP/magic link) and persists a server session.
 *
 * Body (preferred):
 *   { "access_token": "...", "refresh_token": "..." }
 *
 * Also supported via headers:
 *   Authorization: Bearer <access_token>
 *   x-refresh-token: <refresh_token>
 */
export async function POST(req: NextRequest) {
  try {
    // Read tokens from JSON body (or fallback to headers)
    let access_token = '';
    let refresh_token = '';
    try {
      const body = (await req.json()) as Partial<{
        access_token: string;
        refresh_token: string;
      }>;
      access_token = body?.access_token || '';
      refresh_token = body?.refresh_token || '';
    } catch {
      // ignore; will try headers
    }

    if (!access_token) {
      const auth = req.headers.get('authorization') || '';
      if (auth.toLowerCase().startsWith('bearer ')) {
        access_token = auth.slice(7).trim();
      }
    }
    if (!refresh_token) {
      refresh_token = req.headers.get('x-refresh-token') || '';
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { ok: false, error: 'MISSING_TOKENS' },
        { status: 400 }
      );
    }

    // Create server client bound to this response and set the session
    const supabase = supabaseServer();
    const { error: setErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (setErr) {
      return NextResponse.json({ ok: false, error: setErr.message }, { status: 401 });
    }

    // Sanity check that the server now sees a user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: userErr?.message || 'NO_USER' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: true, user: { id: userData.user.id, email: userData.user.email } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'INTERNAL' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS for completeness (if you ever call cross-origin).
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
