// lib/i18n/dict.ts
// Zero-network dictionary loader with safe fallbacks.
// Import small JSONs for chrome copy. Long-form content (manifesto, posts) should live as MD/MDX pages.

import en from '@/locales/en.json';
import np from '@/locales/np.json';

export type Lang = 'en' | 'np';

const DICTS: Record<Lang, Record<string, string>> = { en, np };

export function getDict(lang: Lang): Record<string, string> {
  return DICTS[lang] || DICTS.en;
}

export function resolveLangFromCookie(cookieHeader?: string): Lang {
  if (!cookieHeader) return 'en';
  const match = cookieHeader.match(/(?:^|;\s*)lang=([^;]+)/);
  const val = match?.[1];
  if (val === 'np') return 'np';
  return 'en';
}
