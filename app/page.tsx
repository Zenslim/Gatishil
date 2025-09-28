'use client';

import { useEffect, useState } from 'react';

/**
 * Gatishil Home — single-file replacement
 * - Tailwind-first layout (matches ZenTrust vibe)
 * - Hero with gradient title, CTAs
 * - 'Daily Pulse' card, Principles grid
 * - Blog fetch placeholder (optional: point to your blog RSS)
 *
 * Paste this whole file into /app/page.tsx via GitHub web UI and commit.
 */

function SectionTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-8">
      {kicker && <p className="uppercase tracking-widest text-xs text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl md:text-4xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm md:text-base text-slate-300/80 mt-3">{subtitle}</p>}
    </div>
  );
}

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [articles, setArticles] = useState<{ title: string; link?: string; desc?: string }[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Attempt to fetch a small RSS JSON proxy (optional). If you use blog.zentrust.world, swap the URL.
  useEffect(() => {
    async function load() {
      try {
        // safe fallback — you can change to your Gatishil blog RSS or a simple JSON endpoint
        const proxy = '/api/_blog-sample'; // keep harmless if not present
        const res = await fetch(proxy).catch(() => null);
        if (res && res.ok) {
          const json = await res.json();
          setArticles(json.articles || []);
        } else {
          // graceful static fallback (so UI is never empty)
          setArticles([
            { title: 'Gatishil — The DAO Party of the Powerless', link: '/why', desc: 'Why we begin, how we build, and how you can join the rhythm.' },
            { title: 'Parallel Life: Economics + Culture First', link: '/manifesto', desc: 'Build the soil before planting the flag.' },
          ]);
        }
      } catch (e) {
        setArticles([
          { title: 'Gatishil — The DAO Party of the Powerless', link: '/why', desc: 'Why we begin, how we build, and how you can join the rhythm.' },
        ]);
      } finally {
        setLoadingArticles(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* subtle starfield background (pure CSS Tailwind classes expected in your global CSS) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black opacity-70" />

      <header className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/gatishil-logo-white.png" alt="Gatishil" className="h-10 w-auto" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
            <div>
              <p className="text-xs text-amber-300/90 uppercase tracking-widest">Gatishil</p>
              <p className="text-sm text-slate-300/70">DAO · Guthi · Movement</p>
            </div>
          </div>

          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <a href="/join" className="font-medium hover:text-white">Join</a>
            <a href="/why" className="hover:text-white">Why</a>
            <a href="/how" className="hover:text-white">How</a>
            <a href="/manifesto" className="hover:text-white">Manifesto</a>
            <a href="/polls" className="hover:text-white">Polls</a>
            <a href="/proposals" className="hover:text-white">Proposals</a>
          </nav>

          <div className="flex items-center gap-3">
            <a href="/join" className="hidden sm:inline-block px-4 py-2 rounded-lg bg-amber-400 text-black font-semibold hover:opacity-95 transition">✊ Join</a>
            <a href="/members" className="px-3 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition">Members</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-20 pb-14 px-6 md:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="uppercase tracking-widest text-xs text-amber-300/90">GatishilNepal.org</p>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-3">
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO Party</span> of the Powerless
            </h1>
            <p className="mt-5 text-slate-300/90 text-lg max-w-2xl">
              Not another party of faces — a movement that makes thrones irrelevant. Build parallel life, restore culture, and grow cooperative wealth. Join the rhythm.
            </p>

            <div className="mt-8 flex gap-3 flex-col sm:flex-row">
              <a href="/join" className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold shadow-sm hover:scale-[1.01] transition">✊ Join the Movement</a>
              <a href="#principles" className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition">Read the Principles</a>
              <a href="/why" className="px-5 py-3 rounded-2xl bg-transparent text-sm border border-amber-400 text-amber-300 hover:bg-amber-600/10 transition">Why We Exist</a>
            </div>

            <p className="text-xs text-slate-400 mt-3">By joining you agree to transparent, tamper-proof decisions.</p>
          </div>

          <aside className="card p-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/5 rounded-2xl">
            <h3 className="text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-sm text-slate-300/80 mt-2">Gatishil moves every day — small decisions, big rhythm.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/3">
                  <p className="text-slate-300/80 text-xs">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-4 rounded-xl bg-white/3">
                  <p className="text-slate-300/80 text-xs">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Review →</a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/2">
                <p className="text-xs text-slate-300/80">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section id="principles" className="relative z-10 py-14 px-6 md:px-10 lg:px-16">
        <SectionTitle kicker="Principles" title="DAO as Nepali Wisdom" subtitle="Decentralized. Autonomous. Organization. Inspired by Guthi, Bhakari, Mandal." />
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { title: 'Decentralized', body: 'Power is shared; no throne to capture.' },
            { title: 'Autonomous', body: 'Rules enforce themselves; tamper-resistant.' },
            { title: 'Organization', body: 'A living system — every voice adds to the whole.' },
          ].map((c) => (
            <div key={c.title} className="p-6 rounded-2xl bg-white/3">
              <h3 className="font-semibold text-lg">{c.title}</h3>
              <p className="text-slate-300/80 mt-2 text-sm">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GOALS */}
      <section className="relative z-10 py-14 px-6 md:px-10 lg:px-16">
        <SectionTitle kicker="Goals" title="Now → Next → Later" />
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { k: 'Now', t: 'Launch Movement Hub', d: 'Clear story, strong CTA, daily pulse.' },
            { k: 'Next', t: 'Interactive Decisions', d: 'Polls, proposals, and accountability feeds.' },
            { k: 'Later', t: 'DAO Party', d: 'Formalize when members are economically independent.' },
          ].map((g) => (
            <div key={g.k} className="p-6 rounded-2xl bg-white/3">
              <p className="uppercase tracking-widest text-xs text-amber-300/80">{g.k}</p>
              <h3 className="font-semibold mt-2">{g.t}</h3>
              <p className="text-slate-300/80 text-sm mt-2">{g.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SUBSCRIBE */}
      <section className="relative z-10 py-14 px-6 md:px-10 lg:px-16">
        <SectionTitle kicker="Stay in the Loop" title="Get movement updates" subtitle="We’ll only send essential decisions and outcomes." />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // ELI5: GitHub-only flow — we don't store here. Hook your provider later via an API endpoint.
            alert('Subscribed (placeholder). Replace with your email provider webhook later.');
            setEmail('');
          }}
          className="max-w-md mx-auto p-3 bg-white/4 rounded-2xl flex gap-2"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-slate-400 text-sm px-3"
          />
          <button className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold hover:opacity-95 transition">Subscribe</button>
        </form>
      </section>

      {/* LATEST INSIGHTS */}
      <section className="relative z-10 py-12 px-6 md:px-10 lg:px-16">
        <h2 className="text-3xl font-bold text-center mb-8">Latest Insights</h2>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 justify-center">
          {loadingArticles ? (
            <p className="text-center text-slate-400">Loading insights…</p>
          ) : (
            articles.map((a, i) => (
              <a key={i} href={a.link || '#'} className="block p-6 bg-white/3 rounded-lg hover:bg-white/4 transition max-w-md">
                <h3 className="text-xl font-semibold mb-2">{a.title}</h3>
                <p className="text-slate-300 text-sm">{a.desc || a.title}</p>
              </a>
            ))
          )}
        </div>
      </section>

      <footer className="relative z-10 py-10 px-6 md:px-10 lg:px-16 text-sm text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} GatishilNepal.org · A democracy that moves.</p>
          <nav className="flex gap-4">
            <a href="/join" className="hover:text-white">Join</a>
            <a href="/polls" className="hover:text-white">Polls</a>
            <a href="/proposals" className="hover:text-white">Proposals</a>
            <a href="/docs/PRD" className="hover:text-white">PRD</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
