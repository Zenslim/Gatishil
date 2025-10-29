'use client';
import { useI18n } from '@/lib/i18n';

export default function LocaleSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex gap-2 text-sm">
      <button onClick={() => setLang('en')} className={lang==='en'?'underline':''}>🇬🇧 EN</button>
      <button onClick={() => setLang('np')} className={lang==='np'?'underline':''}>🇳🇵 NP</button>
    </div>
  );
}
