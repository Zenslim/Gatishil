// AUTO-GENERATED API ROUTE
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message, data: [] }, { status: 200 });
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown', data: [] }, { status: 200 });
  }
}
