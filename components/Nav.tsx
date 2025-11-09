// components/Nav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';

type Item = { href: string; label: string };

const items: Item[] = [
  { href: '/', label: 'Home' },
  { href: '/members', label: 'Members' },   // (People → Members)
  { href: '/orgs', label: 'Orgs' },
  { href: '/projects', label: 'Projects' },
  { href: '/money', label: 'Money' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/polls', label: 'Polls' },
  { href: '/proposals', label: 'Proposals' },
  { href: '/api/hello', label: 'Test API →' },
  { href: '/api/people', label: 'People API →' }
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on route change (client-side)
  useEffect(() => {
    const handler = () => setOpen(false);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Close when clicking outside
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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand}>
          ✅ Gatishil
        </Link>

        <nav className={styles.navDesktop} aria-label="Primary">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={styles.link}>
              {i.label}
            </Link>
          ))}
        </nav>

        <button
          ref={btnRef}
          className={styles.burger}
          aria-label="Menu"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
        </button>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`${styles.navMobile} ${open ? styles.open : ''}`}
      >
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={styles.mobileLink}
            onClick={() => setOpen(false)}
          >
            {i.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
