// components/Nav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';
import LocaleSwitch from '@/components/LocaleSwitch';
import { createBrowserSupabase } from '@/lib/supa';

type SessionState = 'unknown' | 'signedOut' | 'signedIn';

/**
 * Single-source Navbar (global).
 * - Desktop: Why, How, What, Manifesto, Polls, Proposals, Members, Blog, FAQ
 * - Right side: Language toggle + Auth-aware actions
 *   - Signed OUT: subtle Login + primary Join
 *   - Signed IN: Dashboard + Logout (no Join/Login)
 * - Mobile: Drawer with same links; language toggle at top
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<SessionState>('unknown');
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Auth state (simple + robust)
  useEffect(() => {
    const supa = createBrowserSupabase();
    supa.auth.getSession().then(({ data }) => setAuth(data.session ? 'signedIn' : 'signedOut'));
    const { data: sub } = supa.auth.onAuthStateChange((_e, session) => {
      setAuth(session ? 'signedIn' : 'signedOut');
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Close on outside click
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
        <Link href="/" className={styles.brand}>
          <span aria-hidden>✅</span>&nbsp;Gatishil Nepal
        </Link>

        {/* Desktop links */}
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

        {/* Right side: language + auth actions */}
        <div className={styles.navDesktop} aria-label="Actions" style={{ gap: '12px' }}>
          <LocaleSwitch />

          {auth === 'signedIn' ? (
            <>
              <Link href="/dashboard" className={styles.link}>Dashboard</Link>
              <form action="/api/auth/logout" method="post">
                <button className={styles.link} type="submit">Logout</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.link}>Login</Link>
              <Link
                href="/join"
                className={`${styles.link}`}
                style={{ background: 'rgb(251 191 36)', color: '#111', padding: '6px 12px', borderRadius: '9999px', fontWeight: 700 }}
              >
                Join
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
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
        <div className={styles.mobileLink} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Language</span>
          <LocaleSwitch />
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
          <>
            <Link href="/dashboard" className={styles.mobileLink} onClick={() => setOpen(false)}>Dashboard</Link>
            <form action="/api/auth/logout" method="post" className={styles.mobileLink}>
              <button type="submit">Logout</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className={styles.mobileLink} onClick={() => setOpen(false)}>Login</Link>
            <Link href="/join" className={styles.mobileLink} onClick={() => setOpen(false)}>Join</Link>
          </>
        )}
      </div>
    </header>
  );
}
