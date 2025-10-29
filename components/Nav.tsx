// components/Nav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';
import { createBrowserSupabase } from '@/lib/supa';
import { useI18n } from '@/lib/i18n';

type SessionState = 'unknown' | 'signedOut' | 'signedIn';

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

/** Locale toggle: EN view → Nepal flag (from /public/nepal.svg). NP view → EN badge. */
function InlineLocaleToggle() {
  const { lang, setLang } = useI18n();
  if (lang === 'en') {
    return (
      <button onClick={() => setLang('np')} aria-label="Switch to Nepali" className={styles.localeBtn} title="Switch to नेपाली">
        <img src="/nepal.svg" alt="" className={styles.flagImg} />
      </button>
    );
  }
  return (
    <button onClick={() => setLang('en')} aria-label="Switch to English" className={styles.localeBtn} title="Switch to English">
      <span className={styles.enBadge}>EN</span>
    </button>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<SessionState>('unknown');
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Supabase auth state
  useEffect(() => {
    const supa = createBrowserSupabase();
    supa.auth.getSession().then(({ data }) => setAuth(data.session ? 'signedIn' : 'signedOut'));
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => setAuth(session ? 'signedIn' : 'signedOut'));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
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
        {/* Brand */}
        <Link href="/" className={styles.brand} aria-label="Gatishil Nepal — Home">
          <div className={styles.brandRow}>
            <img src="/logo.svg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }} alt="Gatishil Nepal" width={28} height={28} />
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>Gatishil Nepal</div>
              <div className={styles.brandSub}>DAO · Guthi · Movement</div>
            </div>
          </div>
        </Link>

        {/* Right actions */}
        <div className={styles.actions}>
          <InlineLocaleToggle />

          {auth === 'signedIn' ? (
            <Link href="/dashboard" aria-label="Dashboard" className={styles.iconBtn}><BlueLoginIcon /></Link>
          ) : (
            <Link href="/login" aria-label="Sign in" className={styles.iconBtn}><BlueLoginIcon /></Link>
          )}

          <button
            ref={btnRef}
            className={styles.burger}
            aria-label="Menu"
            aria-controls="global-drawer"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
          </button>
        </div>
      </div>

      {/* Drawer */}
      <div id="global-drawer" ref={menuRef} className={`${styles.drawer} ${open ? styles.open : ''}`}>
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
        <nav className={styles.drawerBody} aria-label="Menu">
          <Link href="/why" className={styles.drawerLink} onClick={() => setOpen(false)}>Why</Link>
          <Link href="/how" className={styles.drawerLink} onClick={() => setOpen(false)}>How</Link>
          <Link href="/what" className={styles.drawerLink} onClick={() => setOpen(false)}>What</Link>
          <Link href="/#manifesto" className={styles.drawerLink} onClick={() => setOpen(false)}>Manifesto</Link>
          <Link href="/polls" className={styles.drawerLink} onClick={() => setOpen(false)}>Polls</Link>
          <Link href="/proposals" className={styles.drawerLink} onClick={() => setOpen(false)}>Proposals</Link>
          <Link href="/members" className={styles.drawerLink} onClick={() => setOpen(false)}>Members</Link>
          <Link href="/blog" className={styles.drawerLink} onClick={() => setOpen(false)}>Blog</Link>
          <Link href="/faq#dao" className={styles.drawerLink} onClick={() => setOpen(false)}>FAQ</Link>

          <div className={styles.drawerDivider} />
          {auth === 'signedIn' ? (
            <Link href="/dashboard" className={styles.drawerLink} onClick={() => setOpen(false)}>Dashboard</Link>
          ) : (
            <Link href="/login" className={styles.drawerLink} onClick={() => setOpen(false)}>Sign in</Link>
          )}
          <div className={styles.drawerDivider} />

          <div className={styles.drawerRow}>
            <span>Language</span>
            <InlineLocaleToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
