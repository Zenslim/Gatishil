// app/tax/calculator/page.tsx
'use client';

import type { Metadata } from "next";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const metadata: Metadata = {
  title: "True Tax Mirror — Calculator | Gatishil Nepal",
  description:
    "Compute your true effective tax rate by stacking hidden indirect taxes over visible taxes. Built for Nepal.",
  openGraph: {
    title: "True Tax Mirror — Calculator",
    description: "Estimate hidden indirect taxes and see your full effective tax rate.",
    type: "website",
    url: "https://www.gatishilnepal.org/tax/calculator",
  },
};

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Background starfield that matches homepage vibe (pure CSS layers, zero canvas). */
function Starfield() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s" />
        <div className="layer layer-m" />
        <div className="layer layer-l" />
      </div>
      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 90s linear infinite; opacity: 0.9; }
        .layer-s {
          background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size: 120px 120px, 160px 160px;
          background-position: 0 0, 60px 80px;
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.35));
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
    </div>
  );
}

export default function TaxCalculatorPage() {
  const mounted = useMounted();

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Gradient wash identical to homepage tone */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>
      {mounted && <Starfield />}

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-lg md:text-2xl font-semibold tracking-tight"
          >
            True Tax Mirror
          </motion.h1>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white" href="/tax">Landing</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
          </nav>
        </div>
      </header>

      {/* Hero strip */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 pt-6 pb-3 flex items-center justify-between gap-4">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-sm md:text-base text-slate-300/90"
          >
            Stack the invisible with the visible and see your <span className="text-white font-semibold">true effective tax rate</span>.
          </motion.p>
          <motion.a
            href="/tax"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 transition"
          >
            Why it matters
          </motion.a>
        </div>
      </section>

      {/* Calculator (full viewport), no blue box, clean chrome */}
      <section className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16"
        >
          <div className="relative w-full h-[82vh] md:h-[86vh] rounded-2xl overflow-hidden">
            {/* Subtle glow edges; not a colored box */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl bg-gradient-to-r from-amber-500/10 via-white/0 to-rose-500/10" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            <iframe
              title="Nepal True Tax Mirror — Calculator"
              src="/tools/nepal-tax-calculator.html"
              className="absolute inset-0 w-full h-full border-0"
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="mt-3 text-[12px] text-slate-400">
            No sign-in. Nothing stored by default. Assumptions are editable inside the tool.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span>© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org</span>
          <a href="/tax" className="underline underline-offset-4 decoration-white/30 hover:decoration-white">
            Back to Landing
          </a>
        </div>
      </footer>
    </main>
  );
}
