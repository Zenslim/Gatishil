import { NextRequest, NextResponse } from 'next/server';

// Stub endpoint for safe rollout.
// Requires an authenticated session (validated via Supabase on the edge in your middleware).
// Does NOT modify cookies or Supabase password; always no-ops with 200 if a session cookie exists.

export async function POST(req: NextRequest) {
  try {
    // Soft guard: if your middleware protects /onboard and sets a session cookie,
    // we trust that only signed-in users reach here. Still, we can double-check a header.
    const hasCookie = req.cookies.getAll().length > 0;
    if (!hasCookie) {
      return new NextResponse('No session', { status: 401 });
    }

    // Validate body shape
    const { pin } = await req.json().catch(() => ({ pin: '' }));
    if (typeof pin !== 'string' || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      return new NextResponse('Invalid PIN format', { status: 400 });
    }

    // NO-OP: This is deliberately a stub to guarantee zero regression.
    // Later, replace with server-side derivation + Supabase Admin password update.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
