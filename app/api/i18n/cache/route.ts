import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supa';

type OverrideRow = { key: string; np_text: string | null };
type CacheRow = { key: string; translated_text: string | null; updated_at: string | null };

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const [{ data: overrides, error: overridesError }, { data: cache, error: cacheError }] = await Promise.all([
      supabase.from('i18n_overrides').select('key, np_text'),
      supabase
        .from('i18n_cache')
        .select('key, translated_text, updated_at')
        .eq('lang', 'np')
        .order('updated_at', { ascending: false }),
    ]);

    if (overridesError) throw new Error(overridesError.message);
    if (cacheError) throw new Error(cacheError.message);

    const payload: Record<string, string> = {};

    if (cache) {
      for (const row of cache as CacheRow[]) {
        if (!row?.key) continue;
        if (payload[row.key]) continue; // keep the most recent translation per key
        if (typeof row.translated_text !== 'string') continue;
        payload[row.key] = row.translated_text;
      }
    }

    if (overrides) {
      for (const row of overrides as OverrideRow[]) {
        if (!row?.key) continue;
        if (typeof row.np_text !== 'string') continue;
        payload[row.key] = row.np_text;
      }
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'failed to load i18n cache' }, { status: 500 });
  }
}
