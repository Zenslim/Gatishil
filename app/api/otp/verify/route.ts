// app/api/otp/verify/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const { phone, code, name, role } = await req.json().catch(() => ({} as any));
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code || '')) {
      return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // latest unused OTP within 5 minutes
    const { data: rows, error } = await supabase
      .from('otps')
      .select('id, code, created_at, used_at')
      .eq('phone', phone)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const now = Date.now();
    const okRow = (rows || []).find(r => {
      const ageMs = now - new Date(r.created_at).getTime();
      return r.code === code && ageMs <= 5 * 60 * 1000;
    });
    if (!okRow) return NextResponse.json({ ok: false, error: 'Code expired or incorrect' }, { status: 400 });

    await supabase.from('otps').update({ used_at: new Date().toISOString() }).eq('id', okRow.id);

    // minimal people insert (ignore duplicates)
    const payload = { name: name || phone, role: role || null, phone, created_by: null };
    const { error: perr } = await supabase.from('people').insert([payload]);
    if (perr && !String(perr.message).toLowerCase().includes('duplicate')) {
      return NextResponse.json({ ok: true, warn: perr.message });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
