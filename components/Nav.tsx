'use client';
import Link from 'next/link';

export default function Nav() {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/people', label: 'People' },
    { href: '/orgs', label: 'Orgs' },
    { href: '/projects', label: 'Projects' },
    { href: '/money', label: 'Money' },
    { href: '/knowledge', label: 'Knowledge' },
    { href: '/polls', label: 'Polls' },
    { href: '/proposals', label: 'Proposals' },
    { href: '/api/hello', label: 'Test API →' },
    { href: '/api/people', label: 'People API →' }
  ];
  return (
    <nav style={{display:'flex', gap:12, flexWrap:'wrap', margin:'16px 0 32px'}}>
      {items.map(i => <Link key={i.href} href={i.href}>{i.label}</Link>)}
    </nav>
  );
}
