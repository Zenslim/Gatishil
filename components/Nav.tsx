// components/Nav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';

type SessionState = 'unknown' | 'signedOut' | 'signedIn';

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'about': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>;
    case 'blog': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M4 5h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z"/></svg>;
    case 'polls': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M7 10h3v8H7zM14 6h3v12h-3z"/></svg>;
    case 'proposals': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M13 2H6a2 2 0 0 0-2 2v16l4-2 4 2V4h1v5h5l-6-7z"/></svg>;
    case 'members': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"/></svg>;
    case 'manifesto': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5"/></svg>;
    case 'faq': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 15h-1.5V15H12v2zm2.07-7.75-.9.92C12.45 10.9 12 11.5 12 13h-1.5v-.5c0-.83.45-1.5 1.17-2.17l1.24-1.26a1.49 1.49 0 0 0-2.41-1.13 1.5 1.5 0 0 0-.5 1.13H8a3 3 0 1 1 6 0c0 .83-.34 1.58-.93 2.17z"/></svg>;
    case 'dashboard': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M3 13h8V3H3zm10 8h8V3h-8zm-10 0h8v-6H3z"/></svg>;
    case 'login': return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M10 17l5-5-5-5v3H3v4h7zM13 3h8v18h-8"/></svg>;
    default: return null;
  }
}

/** Blue circular “account” icon */
function BlueLoginIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#25A7E1" />
      <circle cx="24" cy="19" r="7" fill="none" stroke="#0A2430" strokeWidth="3" />
      <path d="M12 36c2.5-6 8-9 12-9s9.5 3 12 9" fill="none" stroke="#0A2430" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function InlineLocaleToggle() {
  const { lang, setLang, t } = useI18n();
  if (lang === 'en') {
    return (
      <button
        onClick={() => setLang('np')}
        aria-label={t('nav.locale.switchToNepali', 'Switch to Nepali')}
        className={styles.localeBtn}
        title={t('nav.locale.switchToNepaliTitle', 'Switch to नेपाली')}
      >
        <img src="/nepal.svg" alt="" className={styles.flagImg} />
      </button>
    );
  }
  return (
    <button
      onClick={() => setLang('en')}
      aria-label={t('nav.locale.switchToEnglish', 'Switch to English')}
      className={styles.localeBtn}
      title={t('nav.locale.switchToEnglishTitle', 'Switch to English')}
    >
      <span className={styles.enBadge}>EN</span>
    </button>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<SessionState>('unknown');
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  // Supabase auth
  useEffect(() => {
    const supa = getSupabaseBrowser();
    supa.auth.getSession().then(({ data }) => setAuth(data.session ? 'signedIn' : 'signedOut'));
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => setAuth(session ? 'signedIn' : 'signedOut'));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Body scroll lock
  useEffect(() => {
    const el = document.documentElement;
    if (open) { el.style.overflow = 'hidden'; }
    else { el.style.overflow = ''; }
    return () => { el.style.overflow = ''; };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link
          href="/"
          className={styles.brand}
          aria-label={t('nav.brand.ariaHome', 'Gatishil Nepal — Home')}
        >
          <div className={styles.brandRow}>
            <img
              src="/logo.svg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt={t('nav.brand.alt', 'Gatishil Nepal logo')}
              width={28}
              height={28}
            />
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>{t('nav.brand.title', 'Gatishil Nepal')}</div>
              <div className={styles.brandSub}>{t('nav.brand.subtitle', 'DAO · Guthi · Movement')}</div>
            </div>
          </div>
        </Link>

        <div className={styles.actions}>
          <InlineLocaleToggle />
          {auth === 'signedIn' ? (
            <Link href="/dashboard" aria-label={t('nav.actions.dashboard', 'Dashboard')}><BlueLoginIcon /></Link>
          ) : (
            <Link href="/login" aria-label={t('nav.actions.signIn', 'Sign in')}><BlueLoginIcon /></Link>
          )}
          <button
            ref={btnRef}
            className={styles.burger}
            aria-label={t('nav.burger.label', 'Menu')}
            aria-controls="global-drawer"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span className={styles.burgerInner}>
              <span className={styles.burgerBar} />
              <span className={styles.burgerBar} />
              <span className={styles.burgerBar} />
            </span>
          </button>
        </div>
      </div>

      {/* Full-screen Drawer */}
      {/* FIX: use styles.isOpen (matches .isOpen in CSS) instead of the bare string "open" */}
      <div id="global-drawer" className={`${styles.drawer} ${open ? styles.isOpen : ''}`}>
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.drawer.ariaLabel', 'Main menu')}
        >
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>{t('nav.drawer.title', 'Menu')}</div>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label={t('nav.drawer.close', 'Close menu')}
            >
              ✕
            </button>
          </div>

          <div className={styles.list}>
            <details className={styles.group}>
              <summary><Icon name="about" /> {t('nav.links.about', 'About Us')}</summary>
              <div className={styles.groupInner}>
                <Link href="/why" className={styles.link} onClick={() => setOpen(false)}>{t('nav.links.why', 'Why')}</Link>
                <Link href="/how" className={styles.link} onClick={() => setOpen(false)}>{t('nav.links.how', 'How')}</Link>
                <Link href="/what" className={styles.link} onClick={() => setOpen(false)}>{t('nav.links.what', 'What')}</Link>
              </div>
            </details>

            <Link href="/blog" className={styles.link} onClick={() => setOpen(false)}><Icon name="blog" /> {t('nav.links.blog', 'Blog')}</Link>
            <Link href="/polls" className={styles.link} onClick={() => setOpen(false)}><Icon name="polls" /> {t('nav.links.polls', 'Polls')}</Link>
            <Link href="/proposals" className={styles.link} onClick={() => setOpen(false)}><Icon name="proposals" /> {t('nav.links.proposals', 'Proposals')}</Link>
            <Link href="/members" className={styles.link} onClick={() => setOpen(false)}><Icon name="members" /> {t('nav.links.members', 'Members')}</Link>
            <Link href="/manifesto" className={styles.link} onClick={() => setOpen(false)}><Icon name="manifesto" /> {t('nav.links.manifesto', 'Manifesto')}</Link>
            <Link href="/faq#dao" className={styles.link} onClick={() => setOpen(false)}><Icon name="faq" /> {t('nav.links.faq', 'FAQ')}</Link>

            <div className={styles.divider} />

            {auth === 'signedIn' ? (
              <Link href="/dashboard" className={styles.link} onClick={() => setOpen(false)}><Icon name="dashboard" /> {t('nav.links.dashboard', 'Dashboard')}</Link>
            ) : (
              <Link href="/login" className={styles.link} onClick={() => setOpen(false)}><Icon name="login" /> {t('nav.links.signIn', 'Sign in')}</Link>
            )}

            <div className={styles.footerRow}>
              <span>{t('nav.drawer.language', 'Language')}</span>
              <InlineLocaleToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
