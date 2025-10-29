'use client';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supa';
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
  const [overrides, setOverrides] = useState<Record<Lang, Dict>>({ en: {}, np: {} });
  const inflight = useRef(new Set<string>());
  const overridesRef = useRef<Record<Lang, Dict>>(overrides);

  useEffect(() => { setLangState(detectInitialLang()); }, []);

  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      try {
        const supa = createBrowserSupabase();
        const [cacheRes, overridesRes] = await Promise.all([
          supa.from('i18n_cache').select('key, lang, translated_text'),
          supa.from('i18n_overrides').select('key, np_text'),
        ]);
        if (cancelled) return;

        if (!cacheRes.error && cacheRes.data) {
          setDyn(prev => {
            const next: Record<Lang, Dict> = {
              en: { ...prev.en },
              np: { ...prev.np },
            };
            for (const row of cacheRes.data) {
              if (!row?.key || !row?.lang) continue;
              const lang = row.lang as Lang;
              if (lang !== 'en' && lang !== 'np') continue;
              if (typeof row.translated_text !== 'string') continue;
              next[lang][row.key] = row.translated_text;
            }
            return next;
          });
        }

        if (!overridesRes.error && overridesRes.data) {
          setOverrides(prev => {
            const next: Record<Lang, Dict> = {
              en: { ...prev.en },
              np: { ...prev.np },
            };
            for (const row of overridesRes.data) {
              if (!row?.key) continue;
              next.np[row.key] = row.np_text ?? '';
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to preload i18n cache', err);
      }
    }

    preload();
    return () => { cancelled = true; };
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try { window.localStorage.setItem('lang', next); } catch {}
  }

  const t = (key: string, fallback?: string) => {
    const overrideDict = overrides[lang] ?? {};
    if (overrideDict[key]) return overrideDict[key];
    const dict = { ...base[lang], ...dyn[lang] };
    if (dict[key]) return dict[key];
    // if missing NP, auto-translate from EN (or provided fallback)
    if (lang === 'np') {
      const enText = base.en[key] ?? fallback ?? key;
      if (!inflight.current.has(key)) {
        inflight.current.add(key);
        autoTranslate(key, enText).then((translated) => {
          inflight.current.delete(key);
          if (translated) {
            setDyn(prev => {
              if (overridesRef.current.np[key]) return prev;
              return {
                ...prev,
                np: { ...prev.np, [key]: translated }
              };
            });
          }
        });
      }
      // show EN until NP arrives
      return enText;
    }
    // default EN
    return base.en[key] ?? fallback ?? key;
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang, dyn, overrides]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT() { return useI18n().t; }
