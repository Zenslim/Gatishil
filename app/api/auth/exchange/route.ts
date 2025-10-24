export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return NextResponse.json({ ok: false, error: 'code_required' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const safeUser = data?.user ? { ...data.user } : null;

    return NextResponse.json({
      ok: true,
      session: data?.session ?? null,
      user: safeUser,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'exchange_failed' }, { status: 500 });
  }
}
