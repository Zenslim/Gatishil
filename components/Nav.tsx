// components/Nav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';

function Icon({ name }: { name: string }) {
  // All icons are now colorful; no currentColor usage.
  switch (name) {
    case 'about':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#8B5CF6" opacity="0.15" />
          <path fill="#8B5CF6" d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6z" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#8B5CF6" strokeWidth="1.5" />
        </svg>
      );
    case 'blog':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" fill="#F97316" opacity="0.15" />
          <path fill="#F97316" d="M4 6h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z" />
          <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="#F97316" strokeWidth="1.5" />
        </svg>
      );
    case 'polls':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <rect x="6" y="10" width="4" height="8" rx="1" fill="#22C55E" />
          <rect x="14" y="6" width="4" height="12" rx="1" fill="#16A34A" />
          <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#22C55E" strokeWidth="1.5" opacity="0.8" />
        </svg>
      );
    case 'proposals':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#06B6D4" opacity="0.15" />
          <path d="M15 2v6h6" fill="none" stroke="#06B6D4" strokeWidth="1.5" />
          <path d="M8 12h8M8 16h5" stroke="#06B6D4" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'members':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="9" r="4" fill="#3B82F6" opacity="0.2" />
          <circle cx="12" cy="9" r="3.2" fill="#3B82F6" />
          <path d="M4 20c1.8-4.8 6-7 8-7s6.2 2.2 8 7" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'manifesto':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#EF4444" opacity="0.12" />
          <path d="M9 9h6M9 13h4" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 2v6h6" fill="none" stroke="#EF4444" strokeWidth="1.4" />
        </svg>
      );
    case 'faq':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#EAB308" opacity="0.15" />
          <path d="M12 17h-1.5v-2H12v2z" fill="#EAB308" />
          <path d="M14.2 8.5c0-1.7-1.5-3-3.3-3s-3.3 1.3-3.3 3h1.7c0-.7.7-1.3 1.6-1.3s1.6.6 1.6 1.5c0 .5-.2.9-.7 1.3-.9.8-1.6 1.5-1.6 2.7V13H12c0-1 .6-1.6 1.4-2.3.7-.6 1.3-1.3 1.3-2.2z" fill="#EAB308" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#EAB308" strokeWidth="1.5" />
        </svg>
      );
    case 'login':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <path d="M13 3h7a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-7" fill="none" stroke="#0EA5E9" strokeWidth="1.8" />
          <path d="M10 17l5-5-5-5v3H3v4h7z" fill="#38BDF8" />
        </svg>
      );
    case 'tax':
      return (
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="g-tax" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          <rect x="3" y="5" width="18" height="14" rx="3" fill="url(#g-tax)" opacity="0.18" />
          <path d="M7 13c1.8-2.4 4.2-3.6 7-3.6 1.7 0 3.3.5 5 1.6" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="7" cy="13" r="1.2" fill="#22C55E" />
          <circle cx="19" cy="11" r="1.2" fill="#F59E0B" />
          <path d="M6 9h6M6 16h4" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** Blue circular “account” icon (kept colorful) */
function BlueLoginIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="26" height="26" className={className} aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#25A7E1" />
      <circle cx="24" cy="19" r="7" fill="none" stroke="#0A2430" strokeWidth="3" />
      <path d="M12 36c2.5-6 8-9 12-9s9.5 3 12 9" fill="none" stroke="#0A2430" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.style.overflow = 'hidden';
    else el.style.overflow = '';
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
        <Link href="/" className={styles.brand} aria-label="Gatishil Nepal — Home">
          <div className={styles.brandRow}>
            <img
              src="/logo.svg"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt="Gatishil Nepal"
              width={28}
              height={28}
            />
            <div className={styles.brandText}>
              <div className={styles.brandTitle}>Gatishil Nepal</div>
              <div className={styles.brandSub}>DAO · Guthi · Movement</div>
            </div>
          </div>
        </Link>

        <div className={styles.actions}>
          <Link href="/login" aria-label="Sign in"><BlueLoginIcon /></Link>
          <button
            ref={btnRef}
            className={styles.burger}
            aria-label="Menu"
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
      <div id="global-drawer" className={`${styles.drawer} ${open ? styles.isOpen : ''}`}>
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
        <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label="Main menu">
          <div className={styles.panelHead}>
            <div className={styles.panelTitle}>Menu</div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
          </div>

          <div className={styles.list}>
            <details className={styles.group}>
              <summary><Icon name="about" /> About Us</summary>
              <div className={styles.groupInner}>
                <Link href="/why" className={styles.link} onClick={() => setOpen(false)}>Why</Link>
                <Link href="/how" className={styles.link} onClick={() => setOpen(false)}>How</Link>
                <Link href="/what" className={styles.link} onClick={() => setOpen(false)}>What</Link>
              </div>
            </details>

            <Link href="/blog" className={styles.link} onClick={() => setOpen(false)}><Icon name="blog" /> Blog</Link>
            <Link href="/polls" className={styles.link} onClick={() => setOpen(false)}><Icon name="polls" /> Polls</Link>
            <Link href="/proposals" className={styles.link} onClick={() => setOpen(false)}><Icon name="proposals" /> Proposals</Link>
            <Link href="/members" className={styles.link} onClick={() => setOpen(false)}><Icon name="members" /> Members</Link>
            <Link href="/tax" className={styles.link} onClick={() => setOpen(false)}><Icon name="tax" /> Tax Mirror</Link>
            <Link href="/#manifesto" className={styles.link} onClick={() => setOpen(false)}><Icon name="manifesto" /> Manifesto</Link>
            <Link href="/faq#dao" className={styles.link} onClick={() => setOpen(false)}><Icon name="faq" /> FAQ</Link>

            <div className={styles.divider} />

            <Link href="/login" className={styles.link} onClick={() => setOpen(false)}><Icon name="login" /> Sign in</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
