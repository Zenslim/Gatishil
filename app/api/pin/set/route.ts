export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin: string = (body?.pin ?? '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      return new NextResponse('PIN must be 4–8 digits', { status: 400 });
    }

    const supa = getSupabaseServer();
    const { data: { user }, error: uerr } = await supa.auth.getUser();
    if (uerr || !user) return new NextResponse('Unauthorized', { status: 401 });

    const { hash } = await import('@node-rs/argon2');
    const pin_hash = await hash(pin, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const { error: upErr } = await supa
      .from('trusted_factors')
      .upsert({
        auth_user_id: user.id,
        factor_type: 'pin',
        pin_hash,
        failed_attempts: 0,
        locked_until: null,
      }, { onConflict: 'auth_user_id' });

    if (upErr) return new NextResponse(upErr.message || 'Failed to save PIN', { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
