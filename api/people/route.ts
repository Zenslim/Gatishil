import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json({
      ok: false,
      reason: 'missing_env',
      hint: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables (Production).',
      env: { hasUrl: !!url, hasAnon: !!anon }
    }, { status: 200 });
  }

  try {
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('people').select('*').order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ ok: false, reason: 'query_error', error: error.message, count: 0, data: [] }, { status: 200 });
    }
    return NextResponse.json({ ok: true, count: data?.length ?? 0, data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'unexpected', error: e?.message ?? 'unknown' }, { status: 200 });
  }
}
