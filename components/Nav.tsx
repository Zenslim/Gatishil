'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';
import { createBrowserSupabase } from '@/lib/supa';
import { useI18n } from '@/lib/i18n';

type SessionState = 'unknown' | 'signedOut' | 'signedIn';

function SignInIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={className} fill="currentColor">
      <path d="M12 12c2.76 0 5-2.69 5-6S14.76 0 12 0 7 2.69 7 6s2.24 6 5 6zm0 2c-4.42 0-8 2.24-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.76-3.58-5-8-5z"/>
    </svg>
  );
}

/** Universal language toggle:
 * EN → shows 🇳🇵 (tap to switch to Nepali)
 * NP → shows EN (tap to switch back to English)
 */
function InlineLocaleToggle() {
  const { lang, setLang } = useI18n();
  if (lang === 'en') {
    return (
      <button
        onClick={() => setLang('np')}
        aria-label="Switch to Nepali"
        className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-sm hover:bg-white/5"
      >
        <span aria-hidden>🇳🇵</span>
        <span className="hidden sm:inline">NP</span>
      </button>
    );
  }
  return (
    <button
      onClick={() => setLang('en')}
      aria-label="Switch to English"
      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-1 text-sm hover:bg-white/5"
    >
      <span className="font-semibold">EN</span>
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
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) =>
      setAuth(session ? 'signedIn' : 'signedOut')
    );
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Close mobile drawer on outside click
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
        {/* BRAND: Logo + Title + Subline (always) */}
        <Link href="/" className={styles.brand} aria-label="Gatishil Nepal — Home">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.svg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt="Gatishil Nepal"
              width={28}
              height={28}
              style={{ display: 'block' }}
            />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 700 }}>Gatishil Nepal</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>DAO · Guthi · Movement</div>
            </div>
          </div>
        </Link>

        {/* Desktop links (center) */}
        <nav className={styles.navDesktop} aria-label="Primary">
          <Link href="/why" className={styles.link}>Why</Link>
          <Link href="/how" className={styles.link}>How</Link>
          <Link href="/what" className={styles.link}>What</Link>
          <Link href="/#manifesto" className={styles.link}>Manifesto</Link>
          <Link href="/polls" className={styles.link}>Polls</Link>
          <Link href="/proposals" className={styles.link}>Proposals</Link>
          <Link href="/members" className={styles.link}>Members</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/faq#dao" className={styles.link}>FAQ</Link>
        </nav>

        {/* Right side (desktop): Language + Auth */}
        <div className={styles.navDesktop} aria-label="Actions" style={{ gap: 12 }}>
          <InlineLocaleToggle />
          {auth === 'signedIn' ? (
            <Link href="/dashboard" className={styles.link}>Dashboard</Link>
          ) : (
            <Link href="/login" className={styles.link} aria-label="Sign in">
              <SignInIcon />
            </Link>
          )}
        </div>

        {/* Burger (mobile) */}
        <button
          ref={btnRef}
          className={styles.burger}
          aria-label="Menu"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div id="mobile-menu" ref={menuRef} className={`${styles.navMobile} ${open ? styles.open : ''}`}>
        {/* Language first on mobile */}
        <div className={styles.mobileLink} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Language</span>
          <InlineLocaleToggle />
        </div>

        <Link href="/why" className={styles.mobileLink} onClick={() => setOpen(false)}>Why</Link>
        <Link href="/how" className={styles.mobileLink} onClick={() => setOpen(false)}>How</Link>
        <Link href="/what" className={styles.mobileLink} onClick={() => setOpen(false)}>What</Link>
        <Link href="/#manifesto" className={styles.mobileLink} onClick={() => setOpen(false)}>Manifesto</Link>
        <Link href="/polls" className={styles.mobileLink} onClick={() => setOpen(false)}>Polls</Link>
        <Link href="/proposals" className={styles.mobileLink} onClick={() => setOpen(false)}>Proposals</Link>
        <Link href="/members" className={styles.mobileLink} onClick={() => setOpen(false)}>Members</Link>
        <Link href="/blog" className={styles.mobileLink} onClick={() => setOpen(false)}>Blog</Link>
        <Link href="/faq#dao" className={styles.mobileLink} onClick={() => setOpen(false)}>FAQ</Link>

        {/* Auth row on mobile */}
        {auth === 'signedIn' ? (
          <Link href="/dashboard" className={styles.mobileLink} onClick={() => setOpen(false)}>Dashboard</Link>
        ) : (
          <Link href="/login" className={styles.mobileLink} onClick={() => setOpen(false)}>Sign in</Link>
        )}
      </div>
    </header>
  );
}
