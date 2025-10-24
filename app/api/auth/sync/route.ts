export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * This route sets Supabase auth cookies on the server.
 * It is intentionally backward-compatible with BOTH of your previous client flows:
 *
 *  A) Old email callback client sent:
 *     POST /api/auth/sync
 *     { "access_token": "...", "refresh_token": "..." }
 *
 *  B) Newer helper-style client sent:
 *     POST /api/auth/sync
 *     { "event": "SIGNED_IN", "session": { "access_token": "...", "refresh_token": "..." } }
 *
 * We accept either shape and call supabase.auth.setSession() to write cookies.
 * Always 200 JSON so the client can handle UI without breaking.
 */

type LegacyPayload = {
  access_token?: string | null;
  refresh_token?: string | null;
};

type HelperPayload = {
  event?: string | null;
  session?: {
    access_token?: string | null;
    refresh_token?: string | null;
  } | null;
};

function extractTokens(body: any): { access_token: string | null; refresh_token: string | null } {
  // Prefer helper-style if present
  const evt = typeof body?.event === 'string' ? body.event.trim().toUpperCase() : null;
  const sess = body?.session;
  const sessAT = typeof sess?.access_token === 'string' ? sess.access_token : null;
  const sessRT = typeof sess?.refresh_token === 'string' ? sess.refresh_token : null;

  if (evt === 'SIGNED_IN' && sessAT && sessRT) {
    return { access_token: sessAT, refresh_token: sessRT };
  }

  // Fallback to legacy flat shape
  const at = typeof body?.access_token === 'string' ? body.access_token : null;
  const rt = typeof body?.refresh_token === 'string' ? body.refresh_token : null;

  return { access_token: at, refresh_token: rt };
}

export async function POST(req: Request) {
  let body: LegacyPayload & HelperPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 200 });
  }

  const { access_token, refresh_token } = extractTokens(body);

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, error: 'Missing access_token or refresh_token' },
      { status: 200 }
    );
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    // Cookies set successfully – email OTP will proceed to your /onboard redirect in the client
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'setSession failed' }, { status: 200 });
  }
}

export async function GET() {
  // Simple health probe
  return NextResponse.json({
    ok: true,
    version: 'auth-sync-v2',
    expects: 'legacy {access_token,refresh_token} OR helper {event,session}',
    runtime: 'nodejs',
  });
}
