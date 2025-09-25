// app/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

type PeopleResp = { data?: any[]; error?: string };

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/people', { cache: 'no-store' });
        const json: PeopleResp = await res.json();
        setCount(Array.isArray(json?.data) ? json.data.length : 0);
      } catch {
        setCount(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={styles.page}>
      {/* top glow */}
      <div style={styles.glow} />
      <div style={styles.inner}>

        {/* nav */}
        <Nav />

        {/* hero */}
        <section style={styles.hero}>
          <div style={styles.badge}>✅ Gatishil</div>
          <h1 style={styles.h1}>
            One&nbsp;Ledger. <span style={styles.accent}>Six&nbsp;Registers.</span><br />
            Join the movement that builds before it talks.
          </h1>
          <p style={styles.sub}>
            Clear roles. Transparent work. Real delivery. Be a founding member and help us keep Nepal moving—quietly, cleanly, together.
          </p>

          <div style={styles.ctaRow}>
            <Link href="/join" style={{ ...styles.btn, ...styles.btnPrimary }}>🌱 Join Now</Link>
            <Link href="/members" style={{ ...styles.btn, ...styles.btnGhost }}>
              🧑‍🤝‍🧑 Members {loading ? '…' : (count === null ? '' : `(${count})`)}
            </Link>
          </div>

          <div style={styles.metaRow}>
            <Link href="/status" style={styles.metaLink}>System Status</Link>
            <a href="/api/hello" target="_blank" rel="noreferrer" style={styles.metaLink}>Test API</a>
            <a href="/api/people" target="_blank" rel="noreferrer" style={styles.metaLink}>People API</a>
          </div>
        </section>

        {/* registers grid */}
        <section style={styles.grid}>
          <Card title="👥 People" href="/members" desc="Profiles, roles, availability, contact." />
          <Card title="🏛 Orgs" href="/orgs" desc="Teams, circles, accountability, handovers." />
          <Card title="🧭 Projects" href="/projects" desc="Roadmaps, milestones, demos, proof." />
          <Card title="💸 Money" href="/money" desc="Budgets, inflows/outflows, vendor trackers." />
          <Card title="📚 Knowledge" href="/knowledge" desc="Docs, decisions, playbooks, SOPs." />
          <Card title="🗳 Polls & Proposals" href="/polls" desc="Signals, votes, decisions that move." />
        </section>

        {/* promise strip */}
        <section style={styles.strip}>
          <div style={styles.stripInner}>
            <span>Compassion over friction</span>
            <span>•</span>
            <span>Clarity over complexity</span>
            <span>•</span>
            <span>Proof over promises</span>
          </div>
        </section>

      </div>
    </main>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardDesc}>{desc}</div>
    </Link>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    background: 'radial-gradient(1200px 600px at 50% -10%, rgba(16,185,129,0.25), transparent), #000'
  },
  glow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(600px 300px at 80% 0%, rgba(59,130,246,0.22), transparent)'
  },
  inner: { position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' },

  hero: { textAlign: 'center', marginTop: 30, marginBottom: 36 },
  badge: {
    display: 'inline-block', padding: '6px 10px', borderRadius: 999,
    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', fontSize: 12, letterSpacing: 1.2
  },
  h1: { margin: '14px auto 10px', lineHeight: 1.15, fontWeight: 900, fontSize: 42, maxWidth: 900 },
  accent: { background: 'linear-gradient(90deg,#22c55e,#3b82f6)', WebkitBackgroundClip: 'text', color: 'transparent' as any },
  sub: { opacity: 0.9, maxWidth: 760, margin: '10px auto 22px', fontSize: 16 },

  ctaRow: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 },
  btn: {
    padding: '12px 18px', borderRadius: 12, fontWeight: 700, textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.12)'
  },
  btnPrimary: {
    background: 'linear-gradient(90deg,#22c55e,#10b981)',
    color: '#00140a', border: '1px solid rgba(16,185,129,0.5)', boxShadow: '0 10px 30px rgba(34,197,94,0.25)'
  },
  btnGhost: { background: 'rgba(255,255,255,0.06)', color: '#fff' },

  metaRow: { display: 'flex', gap: 14, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap', opacity: 0.8, fontSize: 13 },
  metaLink: { textDecoration: 'none', color: '#9bd6ff' },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
    gap: 16, marginTop: 28
  },
  card: {
    background: 'linear-gradient(180deg,#0f172a,#0b1222)', border: '1px solid #1f2a44', borderRadius: 16,
    padding: 16, textDecoration: 'none', color: '#fff'
  },
  cardTitle: { fontWeight: 800, marginBottom: 6 },
  cardDesc: { opacity: 0.9, fontSize: 14 },

  strip: { marginTop: 36 },
  stripInner: {
    display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap',
    padding: '12px 16px', borderRadius: 999,
    background: 'linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))',
    border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, opacity: 0.9
  }
};
