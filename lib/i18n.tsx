'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '@/locales/en.json';
import np from '@/locales/np.json';

type DictValue = string | Dict;
interface Dict {
  [key: string]: DictValue;
}
export type Lang = 'en' | 'np';

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const base: Record<Lang, Dict> = { en, np };
const LANG_COOKIE = 'lang';
const STORAGE_KEY = 'lang';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=${value};Path=/;Max-Age=${ONE_YEAR_SECONDS};SameSite=Lax${secure}`;
}

function getFromDict(dict: Dict | undefined, path: string): string | undefined {
  if (!dict) return undefined;
  const segments = path.split('.');
  let current: string | Dict | undefined = dict;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';

  const cookieLang = readCookie(LANG_COOKIE);
  if (cookieLang === 'en' || cookieLang === 'np') {
    return cookieLang;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'np') {
      return stored;
    }
  } catch {}

  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [overrides] = useState<Record<Lang, Record<string, string>>>(() => ({ en: {}, np: {} }));

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch {}
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      if (lang === next) return;
      setLangState(next);
      try {
        setCookie(LANG_COOKIE, next);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, next);
        }
      } catch {}
      fetch('/api/i18n/auto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ override: next }),
        cache: 'no-store',
      }).catch(() => {});
    },
    [lang],
  );

  const t = useCallback(
    (key: string, fallback?: string) => {
      const overrideCandidate = overrides[lang]?.[key];
      if (typeof overrideCandidate === 'string' && overrideCandidate.length > 0) {
        return overrideCandidate;
      }

      const localized = getFromDict(base[lang], key);
      if (typeof localized === 'string') {
        return localized;
      }

      const english = overrides.en[key] ?? getFromDict(base.en, key);
      if (typeof english === 'string') {
        if (lang === 'np' && process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] missing Nepali translation for "${key}" — falling back to English.`);
        }
        return english;
      }

      if (fallback) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] missing key "${key}" — using fallback.`);
        }
        return fallback;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[i18n] missing key "${key}" with no fallback provided.`);
      }

      return key;
    },
    [lang, overrides],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within <I18nProvider>.');
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
