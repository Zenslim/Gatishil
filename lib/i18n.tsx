'use client';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import en from '@/locales/en.json';
import np from '@/locales/np.json';

type Dict = Record<string, string>;
type Lang = 'en' | 'np';

const base: Record<'en'|'np', Dict> = { en, np };

type CtxType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const Ctx = createContext<CtxType | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem('lang');
  if (stored === 'en' || stored === 'np') return stored;
  const nav = window.navigator?.language?.toLowerCase() || '';
  if (nav.startsWith('ne') || nav.startsWith('hi')) return 'np';
  return 'en';
}

async function autoTranslate(key: string, english: string): Promise<string | null> {
  try {
    const res = await fetch('/api/i18n/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, source: 'en', target: 'np', text: english }),
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translated ?? null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [dyn, setDyn] = useState<Record<Lang, Dict>>({ en: {}, np: {} });
  const inflight = useRef(new Set<string>());

  const logMissing = useCallback((key: string, english: string) => {
    try {
      const context =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search ?? ''}`
          : undefined;

      const body = JSON.stringify({
        key,
        text: english,
        ...(context ? { context } : {}),
      });

      void fetch('/api/i18n/missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore logging errors entirely to avoid UI impact
    }
  }, []);

  useEffect(() => { setLangState(detectInitialLang()); }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try { window.localStorage.setItem('lang', next); } catch {}
  }

  const t = (key: string, fallback?: string) => {
    const dict = { ...base[lang], ...dyn[lang] };
    if (dict[key]) return dict[key];
    // if missing NP, auto-translate from EN (or provided fallback)
    if (lang === 'np') {
      const enText = base.en[key] ?? fallback ?? key;
      if (!inflight.current.has(key)) {
        inflight.current.add(key);
        logMissing(key, enText);
        autoTranslate(key, enText).then((translated) => {
          inflight.current.delete(key);
          if (translated) {
            setDyn(prev => ({
              ...prev,
              np: { ...prev.np, [key]: translated }
            }));
          }
        });
      }
      // show EN until NP arrives
      return enText;
    }
    // default EN
    return base.en[key] ?? fallback ?? key;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang, dyn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT() { return useI18n().t; }
