'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import ClientOnly from '@/components/ClientOnly';

/** util to avoid hydration mismatch */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.35 }
});

/** Section Title */
function SectionTitle({
  id,
  kicker,
  title,
  subtitle
}: {
  id?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div id={id} className="text-center max-w-3xl mx-auto mb-8 px-2">
      {kicker && <p className="uppercase tracking-widest text-[10px] text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl sm:text-3xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm sm:text-base text-slate-300/85 mt-3">{subtitle}</p>}
    </div>
  );
}

/** Starfield */
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
  const mounted = useMounted();

  return (
    <main className="relative min-h-screen bg-black text-white">

      {/* Background */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.9] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      <ClientOnly>{mounted ? <Starfield /> : null}</ClientOnly>

      {/* ------------------------------ */}
      {/* HERO SECTION — INNER & OUTER FLOW */}
      {/* ------------------------------ */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-12 items-center">

          {/* LEFT — TEXT */}
          <div className="lg:col-span-7">
            <motion.span
              className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full"
              {...fadeUp(0)}
            >
              THE INNER → OUTER MOVEMENT
            </motion.span>

            <motion.h1
              className="text-[32px] sm:text-5xl md:text-6xl font-extrabold leading-tight mt-3"
              {...fadeUp(0.05)}
            >
              Restore the Flow.<br />
              Awaken the Citizen.<br />
              Build the System.
            </motion.h1>

            <motion.p
              className="mt-5 text-slate-300/95 text-lg sm:text-xl max-w-2xl font-medium"
              {...fadeUp(0.1)}
            >
              True change begins where the vote is cast — within the self.  
              Inner clarity gives birth to outer integrity.  
              We unite self-awareness with transparent systems to end corruption from the inside out.
            </motion.p>

            <motion.div className="mt-7 flex flex-col xs:flex-row gap-3" {...fadeUp(0.16)}>
              <a
                href="/join"
                className="px-6 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] transition"
              >
                Start Your Inner & Outer Journey
              </a>
              <a
                href="#manifesto"
                className="px-6 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
              >
                Read the Full Manifesto
              </a>
            </motion.div>

            <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.22)}>
              By joining, you agree to transparent, tamper-proof community decisions.
            </motion.p>
          </div>

          {/* RIGHT — VISUAL SPLIT */}
          <motion.div
            className="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_45px_rgba(255,255,255,0.05)]"
            {...fadeUp(0.1)}
          >
            <div className="grid grid-cols-2 h-full">
              <div className="bg-[url('/inner-flow.jpg')] bg-cover bg-center min-h-[260px] flex items-end p-4">
                <p className="text-xs uppercase tracking-wide text-white/80 bg-black/40 px-2 py-1 rounded-md">
                  Inner • Awareness
                </p>
              </div>
              <div className="bg-[url('/outer-flow.jpg')] bg-cover bg-center min-h-[260px] flex items-end p-4">
                <p className="text-xs uppercase tracking-wide text-white/80 bg-black/40 px-2 py-1 rounded-md">
                  Outer • Action
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ------------------------------ */}
      {/* THREE CORE PILLARS */}
      {/* ------------------------------ */}
      <section className="relative z-10 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <SectionTitle
            kicker="Core Philosophy"
            title="The Three Pillars of Change"
            subtitle="A movement built on inner clarity, transparent systems, and collective sovereignty."
          />

          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">

            <motion.div {...fadeUp(0.02)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">👁️ Conscious Self-Rule</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                Transformation begins with self-knowledge.  
                A citizen aware of their fear, craving, and ego cannot be manipulated by any throne.
              </p>
            </motion.div>

            <motion.div {...fadeUp(0.04)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🌍 Transparent Systems</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                When every rupee shines and every decision is visible, corruption dies naturally.  
                Transparency is not a rule — it is a light.
              </p>
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🕊 Collective Sovereignty</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                When individuals awaken together, the collective becomes powerful enough to make any throne irrelevant.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* MANIFESTO — 8 INTEGRATED PILLARS */}
      {/* ------------------------------ */}
      <section className="relative z-10 py-12 sm:py-14" id="manifesto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">

          <SectionTitle
            kicker="Manifesto"
            title="The Eight Pillars of Integrated Evolution"
            subtitle="Inner awakening → Outer reform → Collective sovereignty."
          />

          <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">

            {/* AWARENESS */}
            <motion.div {...fadeUp(0.02)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                👁️ Awareness — The Sovereign Self
              </h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Inner clarity is the root of all outer reform.  
                A free person cannot elect a tyrant.  
                Awareness uproots fear, greed, and blind allegiance.
              </p>
            </motion.div>

            {/* LIVELIHOOD */}
            <motion.div {...fadeUp(0.04)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">🌱 Livelihood — Rooted Self-Reliance</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Prosperity grows when we reclaim dignity of work.  
                Self-reliance breaks the chains of borrowed survival.
              </p>
            </motion.div>

            {/* JUSTICE */}
            <motion.div {...fadeUp(0.06)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">⚖️ Justice — Impartiality of Spirit</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                The law must be blind, especially to the powerful.  
                Only an awakened conscience cannot be bought.
              </p>
            </motion.div>

            {/* TRANSPARENCY */}
            <motion.div {...fadeUp(0.08)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">🌍 Transparency — The Inner Light Made Visible</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Every rupee should shine, every decision be seen.  
                We open the nation’s books only after we open our own hearts.
              </p>
            </motion.div>

            {/* SOLIDARITY */}
            <motion.div {...fadeUp(0.10)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">🤝 Solidarity — Unity of Conscious Minds</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Our unity is not herd instinct — it is harmony among free individuals.
              </p>
            </motion.div>

            {/* SERVITUDE */}
            <motion.div {...fadeUp(0.12)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">🛠 Servitude — The Ego of Service</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Leadership is duty, not business.  
                Only one who conquers their ego can serve the nation.
              </p>
            </motion.div>

            {/* CULTURE */}
            <motion.div {...fadeUp(0.14)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">🎶 Culture — Authenticity of Expression</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Many voices, one flow.  
                A chorus of honest souls becomes a civilization.
              </p>
            </motion.div>

            {/* FREEDOM */}
            <motion.div {...fadeUp(0.16)} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-lg">❤️ Freedom — The Non-Negotiable Birthright</h3>
              <p className="mt-2 text-sm text-slate-300/85">
                Freedom is our natural state.  
                A bird forgets the sky only when caged too long.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* FOOTER */}
      {/* ------------------------------ */}
      <footer className="relative z-10 py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 text-center">
          <p>© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org</p>
          <p className="text-slate-400 mt-1">From Inner Clarity → Outer Reform.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            <a href="/join" className="hover:text-white">Join</a>
            <a href="/polls" className="hover:text-white">Polls</a>
            <a href="/proposals" className="hover:text-white">Proposals</a>
            <a href="/blog" className="hover:text-white">Blog</a>
            <a href="/faq" className="hover:text-white">FAQ</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
