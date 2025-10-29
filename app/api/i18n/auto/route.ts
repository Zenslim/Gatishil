// app/api/i18n/auto/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supa';

type Body = { key: string; source: 'en'; target: 'np'; text: string; context?: string };

function stableHash(input: string) {
  return crypto.createHash('sha256').update(input).digest('base64url').slice(0, 16);
}

// Provider: Google Translate (v2) — requires GOOGLE_TRANSLATE_API_KEY
async function googleTranslate(text: string, target: string) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_TRANSLATE_API_KEY');
  const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target, source: 'en', format: 'text' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('google translate failed');
  const data = await res.json() as any;
  return data?.data?.translations?.[0]?.translatedText as string;
}

// Provider: Azure Translator — requires AZURE_TRANSLATOR_KEY & AZURE_TRANSLATOR_REGION
async function azureTranslate(text: string, target: string) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) throw new Error('Missing AZURE translator env');
  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=${target}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ Text: text }]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('azure translate failed');
  const data = await res.json() as any;
  return data?.[0]?.translations?.[0]?.text as string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { key, source, target, text, context } = body;
    if (!key || !text) return NextResponse.json({ error: 'missing key/text' }, { status: 400 });

    const supa = createServerSupabase();
    const hash = stableHash(`${text}::${context ?? ''}::${target}`);

    const { data: overrideRow } = await supa
      .from('i18n_overrides')
      .select('np_text')
      .eq('key', key)
      .maybeSingle();

    if (overrideRow?.np_text) {
      return NextResponse.json({ translated: overrideRow.np_text, override: true });
    }

    // 1) Check cache
    const { data: found, error: findErr } = await supa
      .from('i18n_cache')
      .select('translated_text')
      .eq('lang', target)
      .eq('key', key)
      .eq('hash', hash)
      .maybeSingle();
    if (found?.translated_text) {
      return NextResponse.json({ translated: found.translated_text, cached: true });
    }

    // 2) Translate
    const provider = process.env.TRANSLATOR_PROVIDER || 'google';
    let translated: string;
    if (provider === 'azure') translated = await azureTranslate(text, target);
    else translated = await googleTranslate(text, target);

    // 3) Store cache (unless an override was added meanwhile)
    const { data: overrideExists } = await supa
      .from('i18n_overrides')
      .select('key')
      .eq('key', key)
      .maybeSingle();

    if (!overrideExists?.key) {
      await supa.from('i18n_cache').upsert({
        key, lang: target, source_text: text, translated_text: translated, hash
      });
    }

    return NextResponse.json({ translated, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
