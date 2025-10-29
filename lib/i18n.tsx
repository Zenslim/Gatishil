'use client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const hasFetchedCache = useRef(false);

  useEffect(() => { setLangState(detectInitialLang()); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lang !== 'np') return;
    if (hasFetchedCache.current) return;
    hasFetchedCache.current = true;

    let cancelled = false;

    fetch('/api/i18n/cache', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, string> | null) => {
        if (cancelled || !data) return;
        setDyn((prev) => ({
          ...prev,
          np: { ...prev.np, ...data },
        }));
      })
      .catch(() => {
        /* ignore fetch failures */
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lang', next);
      }
    } catch {}
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
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
  }, [dyn, lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t, dyn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

export function useT() { return useI18n().t; }
