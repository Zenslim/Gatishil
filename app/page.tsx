'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Gatishil — Final Animated Homepage
 * - Subtle cosmic gradient + starfield fades in on scroll
 * - Hero: staggered reveal, spring CTAs
 * - 4-button CTA row: Why / How / What / Insights (ZenTrust style)
 * - Logo in header (/public/gatishil-logo.png), hides if missing
 */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } }
});

const staggerParent = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

function SectionTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-8">
      {kicker && <p className="uppercase tracking-widest text-[10px] text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl md:text-4xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm md:text-base text-slate-300/80 mt-3">{subtitle}</p>}
    </div>
  );
}

/** Starfield: CSS layers, opacity bound to scroll progress */
function Starfield() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);

  const layers = useMemo(() => {
    const gen = (count: number) =>
      Array.from({ length: count })
        .map(() => {
          const x = Math.floor(Math.random() * 2000) - 1000;
          const y = Math.floor(Math.random() * 2000) - 1000;
          return `${x}px ${y}px 1px rgba(255,255,255,0.9)`;
        })
        .join(', ');
    return { small: gen(500), mid: gen(200), big: gen(80) };
  }, []);

  return (
    <motion.div style={{ opacity }} className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0">
        <div className="stars-small" />
        <div className="stars-mid" />
        <div className="stars-big" />
      </div>
      <style jsx global>{`
        .stars-small,
        .stars-mid,
        .stars-big {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${layers.small};
          animation: twinkle 5s linear infinite;
          transform: translate(-50%, -50%);
        }
        .stars-mid { width: 2px; height: 2px; box-shadow: ${layers.mid}; animation-duration: 7s; }
        .stars-big { width: 3px; height: 3px; box-shadow: ${layers.big}; animation-duration: 9s; }
        @keyframes twinkle { 0%,100%{opacity:0.8;} 50%{opacity:0.3;} }
      `}</style>
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Subtle cosmic base (gradients) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      {/* Cinematic starfield (fades in on scroll) */}
      <Starfield />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-8 md:pt-10 relative z-10">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className="text-[10px] text-amber-300/90 uppercase tracking-widest">Gatishil</p>
              <p className="text-[11px] text-slate-300/70">DAO · Guthi · Movement</p>
            </div>
          </a>

          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            {[
              ['Join', '/join'],
              ['Why', '/why'],
              ['How', '/how'],
              ['Manifesto', '/manifesto'],
              ['Polls', '/polls'],
              ['Proposals', '/proposals']
            ].map(([label, href]) => (
              <a key={label} className="hover:text-white" href={href}>{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href="/members" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Members</a>
            <motion.a
              href="/join"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="hidden sm:inline-block px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]"
            >
              ✊ Join
            </motion.a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-16 md:pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 grid lg:grid-cols-12 gap-12 items-center">
          <motion.div variants={staggerParent} initial="initial" animate="animate" className="lg:col-span-7">
            <motion.span
              className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full"
              {...fadeUp(0)}
            >
              GatishilNepal.org
            </motion.span>

            <motion.h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-4" {...fadeUp(0.05)}>
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO Party</span> of the Powerless
            </motion.h1>

            <motion.p className="mt-5 text-slate-300/90 text-lg max-w-2xl" {...fadeUp(0.12)}>
              Not another party of faces — a movement that makes thrones irrelevant.
              Build parallel life, restore culture, and grow cooperative wealth. Join the rhythm.
            </motion.p>

            {/* Primary CTAs */}
            <motion.div className="mt-8 flex gap-3 flex-col sm:flex-row" variants={staggerParent}>
              <motion.a
                href="/join"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold transition"
              >
                ✊ Join the Movement
              </motion.a>
              <motion.a
                href="#principles"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition"
              >
                Read the Principles
              </motion.a>
              <motion.a
                href="/why"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-amber-400 text-amber-300 text-sm hover:bg-amber-600/10 transition"
              >
                Why We Exist
              </motion.a>
            </motion.div>

            {/* 4-button CTA row (ZenTrust style) */}
            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 0.2 } }}
            >
              <a href="/why" className="px-4 py-2 rounded-2xl bg-white text-black text-sm font-semibold hover:scale-[1.02] transition">
                🌱 Why We Exist
              </a>
              <a href="/how" className="px-4 py-2 rounded-2xl border border-white/30 text-sm hover:bg-white/5 transition">
                🛠 How We Work
              </a>
              <a href="/what" className="px-4 py-2 rounded-2xl bg-emerald-500 text-white text-sm font-semibold hover:scale-[1.02] transition">
                🌍 What We Offer
              </a>
              <a href="/insights" className="px-4 py-2 rounded-2xl bg-violet-600 text-white text-sm font-semibold hover:scale-[1.02] transition">
                ✨ Our Insights
              </a>
            </motion.div>

            <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.26)}>
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </motion.div>

          {/* Right: Pulse card */}
          <motion.aside
            {...fadeUp(0.15)}
            className="lg:col-span-5 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
          >
            <h3 className="text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-sm text-slate-300/80 mt-2">Gatishil moves every day — small decisions, big rhythm.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-xs">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-xs">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Review →</a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.06 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <p className="text-xs text-slate-300/80">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </motion.div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section id="principles" className="relative z-10 py-14">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <SectionTitle
            kicker="Principles"
            title="DAO as Nepali Wisdom"
            subtitle="Decentralized. Autonomous. Organization. Inspired by Guthi, Bhakari, Mandal."
          />
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              { title: 'Decentralized', body: 'Power is shared; no throne to capture.' },
              { title: 'Autonomous', body: 'Rules enforce themselves; tamper-resistant.' },
              { title: 'Organization', body: 'A living system — every voice adds to the whole.' }
            ].map((c) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
              >
                <h3 className="font-semibold text-lg">{c.title}</h3>
                <p className="text-slate-300/80 mt-2 text-sm">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GOALS */}
      <section className="relative z-10 pb-14">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <SectionTitle kicker="Goals" title="Now → Next → Later" subtitle="A rhythm, not a rush." />
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              { k: 'Now', t: 'Launch Movement Hub', d: 'Clear story, strong CTA, daily pulse.' },
              { k: 'Next', t: 'Interactive Decisions', d: 'Polls, proposals, and accountability feeds.' },
              { k: 'Later', t: 'DAO Party', d: 'Formalize when members are economically independent.' }
            ].map((g, i) => (
              <motion.div
                key={g.k}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10"
              >
                <p className="uppercase tracking-widest text-[10px] text-amber-300/80">{g.k}</p>
                <h3 className="font-semibold mt-2">{g.t}</h3>
                <p className="text-slate-300/80 text-sm mt-2">{g.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-10 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-3">
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
