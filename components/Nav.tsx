'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';
import { createBrowserSupabase } from '@/lib/supa';
import { useI18n } from '@/lib/i18n';

type SessionState = 'unknown' | 'signedOut' | 'signedIn';

/** Inline Nepal flag SVG (double-pennon), ensures visibility on all platforms */
function FlagNP({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      aria-hidden
      role="img"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="npEdge" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d3f8f" />
          <stop offset="1" stopColor="#0b2c6f" />
        </linearGradient>
      </defs>
      {/* Border */}
      <path d="M6 4 L94 65 L36 65 L94 126 L6 126 Z" fill="url(#npEdge)"/>
      {/* Red field (inset) */}
      <path d="M10 10 L86 65 L32 65 L86 120 L10 120 Z" fill="#d82027"/>
      {/* Crescent + sun (simplified iconic shapes) */}
      <g fill="#fff">
        {/* Crescent (upper) */}
        <path d="M28 40 a16 16 0 1 0 24 0 a12 12 0 1 1 -24 0z"/>
        {/* Sun (lower) */}
        <circle cx="48" cy="90" r="10"/>
        <g transform="translate(48,90)">
          {Array.from({length:12}).map((_,i)=>(
            <rect key={i} x="-1.2" y="-15" width="2.4" height="6" transform={`rotate(${i*30})`} />
          ))}
        </g>
      </g>
      {/* Blue outline stroke */}
      <path d="M6 4 L94 65 L36 65 L94 126 L6 126 Z" fill="none" stroke="#0b2c6f" strokeWidth="3"/>
    </svg>
  );
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

/** Locale toggle:
 * EN UI → show Nepal flag (switches to Nepali)
 * NP UI → show EN text (switches to English)
 */
function InlineLocaleToggle() {
  const { lang, setLang } = useI18n();
  if (lang === 'en') {
    return (
      <button
        onClick={() => setLang('np')}
        aria-label="Switch to Nepali"
        className="inline-flex items-center justify-center rounded-full border border-white/15 px-2 py-1 hover:bg-white/5"
        title="Switch to नेपाली"
      >
        <FlagNP />
      </button>
    );
  }
  return (
    <button
      onClick={() => setLang('en')}
      aria-label="Switch to English"
      className="inline-flex items-center justify-center rounded-full border border-white/15 px-2 py-1 hover:bg-white/5 font-semibold"
      title="Switch to English"
    >
      EN
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
        {/* Brand: Logo + Title + Subline */}
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

        {/* Right: language, login/dashboard icon, hamburger */}
        <div className="flex items-center gap-3">
          <InlineLocaleToggle />

          {auth === 'signedIn' ? (
            <Link href="/dashboard" aria-label="Dashboard">
              <BlueLoginIcon />
            </Link>
          ) : (
            <Link href="/login" aria-label="Sign in">
              <BlueLoginIcon />
            </Link>
          )}

          {/* Hamburger — forced visible on desktop too */}
          <button
            ref={btnRef}
            className={styles.burger}
            aria-label="Menu"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} // override any desktop hide
          >
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
            <span className={styles.burgerBar} />
          </button>
        </div>
      </div>

      {/* Drawer (used on all breakpoints) */}
      <div id="mobile-menu" ref={menuRef} className={`${styles.navMobile} ${open ? styles.open : ''}`}>
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

        {auth === 'signedIn' ? (
          <Link href="/dashboard" className={styles.mobileLink} onClick={() => setOpen(false)}>Dashboard</Link>
        ) : (
          <Link href="/login" className={styles.mobileLink} onClick={() => setOpen(false)}>Sign in</Link>
        )}
      </div>
    </header>
  );
}
