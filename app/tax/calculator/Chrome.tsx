// app/tax/calculator/Chrome.tsx
'use client';

import { useEffect, useState } from "react";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

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
        .fade-up { opacity: 0; transform: translateY(12px); animation: fadeUp 0.7s ease-out forwards; }
        .delay-1 { animation-delay: .12s; }
        .fade-in { opacity: 0; transform: translateY(10px) scale(.995); animation: fadeIn .7s ease-out .15s forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn { to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

export default function Chrome() {
  const mounted = useMounted();
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Gradient wash matching homepage */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>
      {mounted && <Starfield />}

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight fade-up">True Tax Mirror</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white" href="/tax">Landing</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
          </nav>
        </div>
      </header>

      {/* Sub-hero strip */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 pt-6 pb-3 flex items-center justify-between gap-4">
          <p className="text-sm md:text-base text-slate-300/90 fade-up delay-1">
            Stack the invisible with the visible and see your <span className="text-white font-semibold">true effective tax rate</span>.
          </p>
          <a
            href="/tax"
            className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 transition"
          >
            Why it matters
          </a>
        </div>
      </section>

      {/* Calculator (full viewport) */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
          <div className="relative w-full h-[82vh] md:h-[86vh] rounded-2xl overflow-hidden fade-in">
            {/* Soft glow edges; no blue box */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl bg-gradient-to-r from-amber-500/10 via-white/0 to-rose-500/10" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            <iframe
              title="Nepal True Tax Mirror — Calculator"
              src="/tools/nepal-tax-mirror.html"
              className="absolute inset-0 w-full h-full border-0"
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="mt-3 text-[12px] text-slate-400">
            No sign-in. Nothing stored by default. Assumptions are editable inside the tool.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span>© {year} GatishilNepal.org</span>
          <a href="/tax" className="underline underline-offset-4 decoration-white/30 hover:decoration-white">
            Back to Landing
          </a>
        </div>
      </footer>
    </main>
  );
}
