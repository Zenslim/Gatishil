'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState } from 'react';

/**
 * Gatishil — Final Animated Homepage with compelling nav + Login + hamburger
 * - Desktop nav: Why, How, What, Manifesto, Polls, Proposals, Members, Blog
 * - Header actions: Login (secondary), ✊ Join (primary)
 * - Mobile: accessible hamburger menu with animated slide-down
 * - Subtle cosmic gradient + CSS-only starfield (fades in on scroll)
 * - Hero streamlined → ✊ Join + Read the Principles
 * - Principles: six jaw-dropping blocks
 * - Logo in header (/public/gatishil-logo.png) and hides if missing
 */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.4 }
});

function SectionTitle(props: { kicker?: string; title: string; subtitle?: string }) {
  const { kicker, title, subtitle } = props;
  return (
    <div className="text-center max-w-3xl mx-auto mb-8">
      {kicker && <p className="uppercase tracking-widest text-[10px] text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl md:text-4xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm md:text-base text-slate-300/80 mt-3">{subtitle}</p>}
    </div>
  );
}

/** CSS-only starfield, opacity bound to scroll progress (no template strings) */
function Starfield() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);

  return (
    <motion.div style={{ opacity }} className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s"></div>
        <div className="layer layer-m"></div>
        <div className="layer layer-l"></div>
      </div>

      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 60s linear infinite; opacity: 0.9; }
        .layer-s {
          background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size: 120px 120px, 160px 160px;
          background-position: 0 0, 60px 80px;
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.35));
          animation-duration: 90s;
        }
        .layer-m {
          background-image:
            radial-gradient(white 1.5px, transparent 2px),
            radial-gradient(white 1.5px, transparent 2px);
          background-size: 200px 200px, 260px 260px;
          background-position: 40px 20px, 160px 100px;
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.25));
          animation-duration: 120s;
        }
        .layer-l {
          background-image:
            radial-gradient(white 2px, transparent 2.5px),
            radial-gradient(white 2px, transparent 2.5px);
          background-size: 320px 320px, 420px 420px;
          background-position: 120px 60px, 260px 180px;
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.2));
          animation-duration: 150s;
        }
        @keyframes drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(-2%, -3%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </motion.div>
  );
}

export default function HomePage() {
  const [open, setOpen] = useState(false);

  const NavLinks = () => (
    <>
      <a className="hover:text-white" href="/why">Why</a>
      <a className="hover:text-white" href="/how">How</a>
      <a className="hover:text-white" href="/what">What</a>
      <a className="hover:text-white" href="/manifesto">Manifesto</a>
      <a className="hover:text-white" href="/polls">Polls</a>
      <a className="hover:text-white" href="/proposals">Proposals</a>
      <a className="hover:text-white" href="/members">Members</a>
      <a className="hover:text-white" href="/blog">Blog <span className="text-slate-400">(Our Insights)</span></a>
    </>
  );

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Subtle cosmic base (gradients) */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      {/* Cinematic starfield (fades in on scroll) */}
      <Starfield />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-6 md:pt-8 relative z-20">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className="text-[10px] text-amber-300/90 uppercase tracking-widest">Gatishil Nepal</p>
              <p className="text-[11px] text-slate-300/70">DAO · Guthi · Movement</p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <NavLinks />
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <motion.a
              href="/join"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]"
            >
              ✊ Join
            </motion.a>
          </div>

          {/* Hamburger for mobile */}
          <button
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-menu"
            aria-expanded={open ? 'true' : 'false'}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border border-white/10 hover:bg-white/5"
          >
            {!open ? (
              // Hamburger icon
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              // Close icon
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu (animated) */}
        <motion.div
          id="mobile-menu"
          initial={false}
          animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          className="md:hidden overflow-hidden"
        >
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-sm text-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a href="/why" className="hover:text-white">Why</a>
              <a href="/how" className="hover:text-white">How</a>
              <a href="/what" className="hover:text-white">What</a>
              <a href="/manifesto" className="hover:text-white">Manifesto</a>
              <a href="/polls" className="hover:text-white">Polls</a>
              <a href="/proposals" className="hover:text-white">Proposals</a>
              <a href="/members" className="hover:text-white">Members</a>
              <a href="/blog" className="hover:text-white">Blog <span className="text-slate-400">(Our Insights)</span></a>
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/login" className="flex-1 px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition text-center">Login</a>
              <a href="/join" className="flex-1 px-3 py-2 rounded-lg bg-amber-400 text-black font-semibold text-center">✊ Join</a>
            </div>
          </div>
        </motion.div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-14 md:pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
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

            {/* Primary CTAs — Join + Read (streamlined) */}
            <div className="mt-8 flex gap-3 flex-col sm:flex-row">
              <motion.a
                href="/join"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold transition"
                {...fadeUp(0.18)}
              >
                ✊ Join the Movement
              </motion.a>
              <motion.a
                href="#principles"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition"
                {...fadeUp(0.2)}
              >
                Read the Principles
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.24)}>
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </div>

          {/* Right: Pulse card */}
          <motion.aside
            className="lg:col-span-5 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
            {...fadeUp(0.18)}
          >
            <h3 className="text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-sm text-slate-300/80 mt-2">Gatishil moves every day — small decisions, big rhythm.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <motion.div className="grid grid-cols-2 gap-3" {...fadeUp(0.22)}>
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

              <motion.div className="p-4 rounded-xl bg-white/5 border border-white/10" {...fadeUp(0.26)}>
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

      {/* PRINCIPLES — Six Jaw-Dropping Blocks */}
      <section id="principles" className="relative z-10 py-14">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
          <SectionTitle
            kicker="Principles"
            title="A Democracy That Breathes"
            subtitle="DAO is our ancient DNA — Guthi, Bhakari, Mandal — reborn in code."
          />

          <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. From Ashes to Spark */}
            <motion.div
              {...fadeUp(0.02)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">1) From Ashes to Spark</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                Their greed isn’t our grave — it’s ignition. We are not the end of their story; we are the spark that begins a new one.
              </p>
            </motion.div>

            {/* 2. DAO = Our Ancient DNA */}
            <motion.div
              {...fadeUp(0.05)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">2) DAO = Our Ancient DNA</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                Decentralized, Autonomous, Organized — not foreign software, but Guthi, Bhakari, and Mandal reborn with technology.
              </p>
            </motion.div>

            {/* 3. Roots Before Thrones */}
            <motion.div
              {...fadeUp(0.08)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">3) Roots Before Thrones</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                We build Pasaguthi (roots) and ZenSara (soil) first. When roots run deep and soil is fertile, politics becomes expression, not a fight.
              </p>
            </motion.div>

            {/* 4. Service, Not Career */}
            <motion.div
              {...fadeUp(0.11)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">4) Service, Not Career</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                Our livelihood stands outside politics — farms, crafts, cooperatives, diaspora. Politics is duty, not salary. हामी पैसा माग्दैनौं, हामी भविष्य उमार्छौं।
              </p>
            </motion.div>

            {/* 5. A Democracy That Breathes */}
            <motion.div
              {...fadeUp(0.14)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">5) A Democracy That Breathes</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                Not once in five years, but every day. Tech is our new chauṭarī; accountability is immediate; youth vote in every decision.
              </p>
            </motion.div>

            {/* 6. The Call Beyond Thrones */}
            <motion.div
              {...fadeUp(0.17)}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_35px_rgba(255,255,255,0.04)]"
            >
              <h3 className="font-semibold text-lg">6) The Call Beyond Thrones</h3>
              <p className="text-slate-300/80 mt-2 text-sm">
                We don’t seize thrones; we make them irrelevant. We are the DAO of the Powerless — and the rhythm has already begun.
              </p>
            </motion.div>
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
                {...fadeUp(0.05 * i)}
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
            <a href="/blog" className="hover:text-white">Blog</a>
            <a href="/docs/PRD" className="hover:text-white">PRD</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
