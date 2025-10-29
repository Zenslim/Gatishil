// app/page.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import ClientOnly from '@/components/ClientOnly';

/** util: run code only after React mounts (prevents hydration mismatch) */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

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

// Replace your DaoWord with this version (supports gradient via className)
function DaoWord({ className = "" }: { className?: string }) {
  return (
    <a href="/faq#dao" className="relative group cursor-help focus:outline-none">
      <span
        className={`underline decoration-dotted underline-offset-2 ${className}`}
        aria-describedby="dao-tooltip"
        tabIndex={0}
      >
        DAO
      </span>
      <span
        id="dao-tooltip"
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[125%] w-[280px] sm:w-[320px] rounded-xl border border-white/15 bg-zinc-900/95 px-3 py-3 text-[11px] text-slate-200 shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0 transition"
      >
        <span className="block text-[11px] font-semibold text-amber-300">
          DAO = Decentralized Autonomous Organization
        </span>
        <span className="block mt-1">Decentralized → Power is shared, no one owns the throne.</span>
        <span className="block">Autonomous → Rules enforce themselves, no backdoor cheating.</span>
        <span className="block">Organization → A living system, where each member’s voice adds to the whole.</span>
        <span className="block mt-2 text-amber-300 underline underline-offset-4">Click to read more →</span>
      </span>
    </a>
  );
}

export default function HomePage() {
  const mounted = useMounted();

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      <ClientOnly>{mounted ? <Starfield /> : null}</ClientOnly>

      {/* HERO (global Nav is rendered by layout.tsx now) */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          {/* Left text */}
          <div className="lg:col-span-7">
            <motion.span
              className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full"
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6 } }} viewport={{ once: true }}
            >
              GatishilNepal.org
            </motion.span>

            <motion.h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.05 }}}
              viewport={{ once: true }}
            >
              The <DaoWord className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400" /> Party of the Powerless.
            </motion.h1>

            <motion.p className="mt-4 text-slate-300/90 text-xl sm:text-2xl font-bold max-w-2xl"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.1 }}}
              viewport={{ once: true }}
            >
              Service, Not Career. Community, Not Power.
            </motion.p>

            <motion.p className="mt-2 text-slate-300/90 text-sm sm:text-base max-w-2xl"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.14 }}}
              viewport={{ once: true }}
            >
              Not another party of faces, but a movement that makes thrones irrelevant.
              Live free without fear. Create together. Restore the flow. Rise as one.
            </motion.p>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <motion.a
                href="/join"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition"
                initial={false}
              >
                Join Us to Restore the Flow
              </motion.a>
              <motion.a
                href="#manifesto"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
                initial={false}
              >
                Read Our Manifesto
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-400 mt-3"
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.18 }}}
              viewport={{ once: true }}
            >
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </div>

          {/* Right: Daily Pulse */}
          <motion.aside
            className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.18 }}}
            viewport={{ once: true }}
          >
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
              Gatishil moves every day — small decisions, big rhythm.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-slate-300/80">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* The rest of the sections stay the same as your current file ... */}
    </main>
  );
}
