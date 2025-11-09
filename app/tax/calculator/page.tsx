// app/tax/calculator/page.tsx
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/** simple mount hook to avoid hydration mismatches */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** homepage-like starfield (CSS-only, super light) */
function Starfield() {
  return (
    <>
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 starfield">
          <div className="layer layer-s"></div>
          <div className="layer layer-m"></div>
          <div className="layer layer-l"></div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.05),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.06),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.05),transparent_60%)]" />
      </div>

      <style jsx>{`
        .starfield { position:absolute; inset:0; overflow:hidden; }
        .layer { position:absolute; inset:-50%; animation:drift 60s linear infinite; opacity:0.9; }
        .layer-s {
          background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size:120px 120px, 160px 160px;
          background-position:0 0, 60px 80px;
          filter:drop-shadow(0 0 1px rgba(255,255,255,0.35));
          animation-duration:90s;
        }
        .layer-m {
          background-image:
            radial-gradient(white 1.5px, transparent 2px),
            radial-gradient(white 1.5px, transparent 2px);
          background-size:200px 200px, 260px 260px;
          background-position:40px 20px, 160px 100px;
          filter:drop-shadow(0 0 2px rgba(255,255,255,0.25));
          animation-duration:120s;
        }
        .layer-l {
          background-image:
            radial-gradient(white 2px, transparent 2.5px),
            radial-gradient(white 2px, transparent 2.5px);
          background-size:320px 320px, 420px 420px;
          background-position:120px 60px, 260px 180px;
          filter:drop-shadow(0 0 3px rgba(255,255,255,0.2));
          animation-duration:150s;
        }
        @keyframes drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(-2%, -3%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </>
  );
}

export default function TaxCalculatorPage() {
  const mounted = useMounted();

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* background like homepage */}
      {mounted && <Starfield />}

      {/* header (matches site chrome) */}
      <header className="relative z-20 w-full border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-8 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide">Gatishil Nepal</p>
              <p className="text-[11px] text-slate-300/80">DAO · Guthi · Movement</p>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white" href="/tax">Landing</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <motion.a
              href="/join"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]"
            >
              Join
            </motion.a>
          </div>
        </div>
      </header>

      {/* hero strip */}
      <section className="relative z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 pt-6 pb-4 flex items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            >
              True Tax Mirror — Calculator
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-slate-300/90 text-sm sm:text-base mt-1"
            >
              Stack the invisible with the visible and see your <span className="text-white font-semibold">real effective rate</span>.
            </motion.p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <a href="/tax" className="text-sm underline underline-offset-4 decoration-white/40 hover:decoration-white">Landing</a>
            <a href="/tax/calculator#advanced" className="text-sm underline underline-offset-4 decoration-white/40 hover:decoration-white">Advanced</a>
          </div>
        </div>
      </section>

      {/* calculator container with glow + motion */}
      <section className="relative z-10 pb-10 sm:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16"
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)] overflow-hidden">
            {/* glow edges */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl bg-gradient-to-r from-cyan-500/10 via-white/0 to-fuchsia-500/10" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            {/* full-height iframe */}
            <div className="relative z-10 w-full h-[calc(100vh-220px)] sm:h-[calc(100vh-200px)] md:h-[80vh]">
              <iframe
                title="True Tax Mirror — Calculator"
                src="/tools/nepal-tax-calculator.html"
                className="absolute inset-0 w-full h-full border-0 rounded-2xl"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* helper strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300/80">
            <p>Nothing is stored by default. Change assumptions inside the tool.</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                Live calculator
              </span>
              <a href="/tax" className="underline underline-offset-4 decoration-white/40 hover:decoration-white">Back to landing</a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-6 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span>© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org</span>
          <span>Educational estimates · Assumptions are editable.</span>
        </div>
      </footer>
    </main>
  );
}
