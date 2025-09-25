import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import { PersonInsert, PersonInsertType } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'iad1';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('people').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = (await req.json()) as unknown;
    // Minimal validation to avoid zod import dependency in patch
    if (!body || typeof (body as any).name !== 'string' || !(body as any).name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const { data, error } = await supabase.from('people').insert({ name: (body as any).name, thar: (body as any).thar ?? null, phone: (body as any).phone ?? null, email: (body as any).email ?? null }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
