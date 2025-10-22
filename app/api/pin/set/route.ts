import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// POST /api/pin/set  { pin: string }
// Requires an authenticated user (session cookies present).
// Stores Argon2id hash in public.trusted_factors (upsert).

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin: string = (body?.pin ?? '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      return new NextResponse('PIN must be 4–8 digits', { status: 400 });
    }

    const supa = getSupabaseServer();

    // Require auth
    const { data: { user }, error: uerr } = await supa.auth.getUser();
    if (uerr || !user) return new NextResponse('Unauthorized', { status: 401 });

    // Hash PIN with Argon2id
    const { hash } = await import('@node-rs/argon2');
    const pin_hash = await hash(pin, {
      algorithm: 2,         // argon2id
      memoryCost: 19456,    // ~19MB
      timeCost: 2,
      parallelism: 1,
    });

    // Ensure table exists (safe if it already does)
    await supa.rpc('exec_sql', { sql: `
      create table if not exists public.trusted_factors (
        auth_user_id uuid primary key references auth.users(id) on delete cascade,
        factor_type text not null default 'pin',
        pin_hash text not null,
        failed_attempts int not null default 0,
        locked_until timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      do $$ begin
        if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_trusted_factors_type') then
          create index idx_trusted_factors_type on public.trusted_factors(factor_type);
        end if;
      end $$;
    `}).catch(() => null); // optional; ignore if rpc not present

    // Upsert
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
