'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState } from 'react';

/**
 * Gatishil — Mobile-first Homepage (merged Manifesto + Principles, 4 Stones)
 * - Header (left): two-line balanced "Gatishil Nepal" over "DAO · Guthi · Movement"
 * - Hero: big slogan + subtext + Join / Read Our Manifesto (#manifesto anchor)
 * - Manifesto: 8 emotional blocks (stories & metaphors)
 * - Our Four Stones: 4 jaw-dropping slogans replacing "Goals"
 * - Footer (centered): © {year} + "Democracy That Flows — Not Stagnates."
 * - Right footer links: Join, Polls, Proposals, Blog
 * - Mobile-first layout; desktop enhances gracefully
 */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.35 }
});

/** Section title */
function SectionTitle(props: { id?: string; kicker?: string; title: string; subtitle?: string }) {
  const { id, kicker, title, subtitle } = props;
  return (
    <div id={id} className="text-center max-w-3xl mx-auto mb-8 px-2">
      {kicker && <p className="uppercase tracking-widest text-[10px] text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl sm:text-3xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm sm:text-base text-slate-300/85 mt-3">{subtitle}</p>}
    </div>
  );
}

/** Subtle starfield that fades in on scroll */
function Starfield() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

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
      {/* Manifesto is on this page (anchor) */}
      <a className="hover:text-white" href="#manifesto">Manifesto</a>
      <a className="hover:text-white" href="/polls">Polls</a>
      <a className="hover:text-white" href="/proposals">Proposals</a>
      <a className="hover:text-white" href="/members">Members</a>
      <a className="hover:text-white" href="/blog">Blog</a>
    </>
  );

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      <Starfield />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-4 sm:pt-6 relative z-20">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-8 sm:h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="leading-tight">
              {/* Two-line balanced left block */}
              <p className="text-[12px] sm:text-sm font-bold tracking-wide text-white">
                Gatishil Nepal
              </p>
              <p className="text-[11px] sm:text-[12px] text-slate-300/80">
                DAO · Guthi · Movement
              </p>
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

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-controls="mobile-menu"
            aria-expanded={open ? 'true' : 'false'}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border border-white/10 hover:bg-white/5"
          >
            {!open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <motion.div
          id="mobile-menu"
          initial={false}
          animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          className="md:hidden overflow-hidden"
        >
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-sm text-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <NavLinks />
            </div>
            <div className="flex gap-2 pt-1">
              <a href="/login" className="flex-1 px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition text-center">Login</a>
              <a href="/join" className="flex-1 px-3 py-2 rounded-lg bg-amber-400 text-black font-semibold text-center">✊ Join</a>
            </div>
          </div>
        </motion.div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          {/* Left text */}
          <div className="lg:col-span-7">
            <motion.span
              className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full"
              {...fadeUp(0)}
            >
              GatishilNepal.org
            </motion.span>

            <motion.h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3" {...fadeUp(0.05)}>
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO Party</span> of the Powerless.
            </motion.h1>

            <motion.p className="mt-4 text-slate-300/90 text-base sm:text-lg max-w-2xl" {...fadeUp(0.1)}>
              <span className="font-semibold">Service, Not Career. Community, Not Power.</span>
            </motion.p>

            <motion.p className="mt-2 text-slate-300/90 text-sm sm:text-base max-w-2xl" {...fadeUp(0.14)}>
              Not another party of faces, but a movement that makes thrones irrelevant.
              Build parallel life, restore culture, and grow cooperative wealth.
            </motion.p>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <motion.a
                href="/join"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition"
                {...fadeUp(0.18)}
              >
                ✋ Join Us
              </motion.a>
              <motion.a
                href="#manifesto"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
                {...fadeUp(0.2)}
              >
                Read Our Manifesto
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.24)}>
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </div>

          {/* Right: Daily Pulse (collapsible on mobile) */}
          <motion.aside
            className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
            {...fadeUp(0.18)}
          >
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
              Gatishil moves every day — small decisions, big rhythm.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <motion.div className="grid grid-cols-2 gap-3" {...fadeUp(0.22)}>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-[11px]">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-[11px]">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Review →</a>
                </div>
              </motion.div>

              <motion.div className="p-3 rounded-xl bg-white/5 border border-white/10" {...fadeUp(0.26)}>
                <p className="text-[11px] text-slate-300/80">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </motion.div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* MANIFESTO — 8 Blocks */}
      <section className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <SectionTitle
            id="manifesto"
            kicker="Manifesto"
            title="Clear commitments, not empty words."
            subtitle="Eight shields of the powerless — simple enough to retell at the tea shop."
          />

          <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1 Courage */}
            <motion.div {...fadeUp(0.02)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🔥 Courage
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• A goat tied too long forgets the taste of grass.</li>
                <li>• One voice in darkness sparks others to speak.</li>
              </ul>
            </motion.div>

            {/* 2 Livelihood */}
            <motion.div {...fadeUp(0.04)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🌱 Livelihood
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• The elephant rope: strength wasted if you think you’re still tied.</li>
                <li>• Eat from your own harvest — no one can buy your hunger.</li>
              </ul>
            </motion.div>

            {/* 3 Justice */}
            <motion.div {...fadeUp(0.06)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                ⚖️ Justice
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• If the fence eats the crops, who protects the field?</li>
                <li>• One law for all — minister and mason alike.</li>
              </ul>
            </motion.div>

            {/* 4 Transparency */}
            <motion.div {...fadeUp(0.08)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🌍 Transparency
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• A thief steals in the dark — decisions must live in sunlight.</li>
                <li>• Muddy water hides fish; clear water builds trust.</li>
              </ul>
            </motion.div>

            {/* 5 Solidarity */}
            <motion.div {...fadeUp(0.1)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🤝 Solidarity
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• One stick breaks; a bundle does not.</li>
                <li>• One drum sounds hollow; many drums shake the earth.</li>
              </ul>
            </motion.div>

            {/* 6 Servitude */}
            <motion.div {...fadeUp(0.12)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🛠 Servitude
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• Politics is not a shop; we close the shop.</li>
                <li>• Serving is like carrying water to a thirsty neighbor — duty, not salary.</li>
              </ul>
            </motion.div>

            {/* 7 Culture */}
            <motion.div {...fadeUp(0.14)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🎶 Culture
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• A drum has rhythm only when both sides strike.</li>
                <li>• A feast works because everyone brings a dish.</li>
              </ul>
            </motion.div>

            {/* 8 Freedom */}
            <motion.div {...fadeUp(0.16)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                ❤️ Freedom
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>• A throne looks powerful only while we kneel.</li>
                <li>• A bird in a cage forgets the sky until it flies.</li>
              </ul>
            </motion.div>
          </div>

          <p className="mt-8 text-center text-[12px] text-slate-400">
            Learn it. Share it. Live it.
          </p>
        </div>
      </section>

      {/* OUR FOUR STONES — replaces "Goals" */}
      <section className="relative z-10 pb-10 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <SectionTitle
            kicker="Foundations"
            title="Our Four Stones"
            subtitle="Unshakable foundations for a democracy that moves."
          />

          <div className="max-w-5xl mx-auto grid gap-4 sm:gap-6 sm:grid-cols-2">
            {/* Tech-Forward Campaigns */}
            <motion.div {...fadeUp(0.02)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🗳 Tech-Forward Campaigns</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">Your Voice, Coded in Trust.</span> Like dropping your vote in a box everyone can see, but no one can steal.
              </p>
            </motion.div>

            {/* Anti-Corruption */}
            <motion.div {...fadeUp(0.04)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">💰 Anti-Corruption</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">Every Rupee Tracked. Every Promise Coded.</span> Like grain in a clear jar — all can see, none can steal.
              </p>
            </motion.div>

            {/* Grassroots Mobilization */}
            <motion.div {...fadeUp(0.06)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🌱 Grassroots Mobilization</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">The Party is You. The Mandate is Ours.</span> Like a field where all farmers plant — no harvest unless all work.
              </p>
            </motion.div>

            {/* Philosophical Foundation */}
            <motion.div {...fadeUp(0.08)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">📜 Philosophical Foundation</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">A New Dharma for a Digital Nepal.</span> Like ancient guthi rules, but written in code — fair, tamper-proof, shared by all.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {new Date().getFullYear()} GatishilNepal.org</p>
            <p className="text-center text-slate-400">Democracy That Flows — Not Stagnates.</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <a href="/join" className="hover:text-white">Join</a>
              <a href="/polls" className="hover:text-white">Polls</a>
              <a href="/proposals" className="hover:text-white">Proposals</a>
              <a href="/blog" className="hover:text-white">Blog</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
