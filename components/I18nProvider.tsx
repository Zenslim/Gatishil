// components/I18nProvider.tsx
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { getDict, type Lang } from '@/lib/i18n/dict';

type Ctx = {
  lang: Lang;
  t: (k: string, fallback?: string) => string;
};

const I18nCtx = createContext<Ctx>({ lang: 'en', t: (k, f) => f ?? k });

function readLangFromCookies(): Lang {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
  const v = m?.[1];
  return v === 'np' ? 'np' : 'en';
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = readLangFromCookies();
  const dict = useMemo(() => getDict(lang), [lang]);
  const t = useMemo(() => (k: string, fb?: string) => dict[k] ?? fb ?? k, [dict]);

  const value = useMemo(() => ({ lang, t }), [lang, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() {
  return useContext(I18nCtx);
}
