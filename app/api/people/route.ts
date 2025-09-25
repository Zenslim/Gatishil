import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { getAdminSupabase } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message, data: [] }, { status: 200 });
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown', data: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, role, email } = body ?? {};
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 });
    }

    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from('people')
      .insert([{ name, role: role ?? null, email: email ?? null }])
      .select('*')
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
