import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload.key !== 'string' || typeof payload.text !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid-body' }, { status: 400 });
    }

    const key = payload.key.trim();
    const text = payload.text;
    if (!key || !text) {
      return NextResponse.json({ ok: false, error: 'missing-fields' }, { status: 400 });
    }

    const enHash = createHash('sha256').update(text).digest('hex');
    const row: {
      key: string;
      en_text: string;
      en_hash: string;
      context?: string;
    } = {
      key,
      en_text: text,
      en_hash: enHash,
    };

    if (typeof payload.context === 'string' && payload.context.trim()) {
      row.context = payload.context.trim().slice(0, 2000);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('i18n_missing').upsert(row, { onConflict: 'key,en_hash' });

    if (error) {
      return NextResponse.json({ ok: false, error: 'upsert-failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'unexpected' }, { status: 500 });
  }
}
