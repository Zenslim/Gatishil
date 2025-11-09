// app/tax/page.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';

/** util: run code only after React mounts (prevents hydration mismatch) */
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

/** Subtle starfield like homepage */
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

export default function TaxLanding() {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();

  const NavLinks = () => (
    <>
      <a className="hover:text-white" href="#why">Why</a>
      <a className="hover:text-white" href="#how">How</a>
      <a className="hover:text-white" href="/tax/calculator">Calculator</a>
    </>
  );

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Background gradients like homepage */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      {mounted ? <Starfield /> : null}

      {/* Header (mirrors homepage structure) */}
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
              <p className="text-[16px] sm:text-sm font-bold tracking-wide text-white">Gatishil Nepal</p>
              <p className="text-[11px] sm:text-[12px] text-slate-300/80">DAO · Guthi · Movement</p>
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
              Join
            </motion.a>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            <a href="/login" className="px-3 py-1.5 border border-white/10 rounded-lg text-[11px] hover:bg-white/5 transition">Login</a>
            <a href="/join" className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-[11px]">Join</a>
          </div>

          {/* Mobile menu button */}
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
              True Tax Mirror
            </motion.span>

            <motion.h1
              className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3"
              {...fadeUp(0.05)}
            >
              The tax you{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">
                never see
              </span>{' '}
              is the one you feel.
            </motion.h1>

            <motion.p
              className="mt-4 text-slate-300/90 text-base sm:text-lg max-w-2xl"
              {...fadeUp(0.1)}
            >
              VAT, excise, fuel and telecom levies hide inside prices. Stack the invisible with your
              visible TDS to see your <span className="text-white font-semibold">true effective tax rate</span>.
            </motion.p>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <motion.a
                href="/tax/calculator"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition"
                {...fadeUp(0.18)}
              >
                Open Calculator
              </motion.a>

              <motion.a
                href="#why"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
                {...fadeUp(0.22)}
              >
                Why it matters
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.24)}>
              No sign-in. Nothing stored by default. Assumptions are editable.
            </motion.p>
          </div>

          {/* Right: animated receipt card */}
          <motion.aside
            className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
            {...fadeUp(0.18)}
          >
            <h3 className="text-base sm:text-lg font-semibold">🧾 Receipt Heatmap (demo)</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
              Watch where the “hidden” layer actually sits.
            </p>

            <div className="mt-3 space-y-4">
              <Bar label="Fuel" value={72} hint="Excise + VAT inside pump price" />
              <Bar label="Telecom" value={38} hint="Service charges embedded" />
              <Bar label="Eating out" value={24} hint="Mostly VATable" />
              <Bar label="Utilities" value={12} hint="Mixed pass-through" />
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
              <Stat title="Visible" value="Rs 8,540" sub="TDS + property" />
              <Stat title="Hidden" value="Rs 13,780" sub="VAT + excise est." highlight />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-4 text-sm text-slate-300/80"
            >
              Example only — your real number appears instantly in the calculator.
            </motion.div>
          </motion.aside>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid md:grid-cols-3 gap-6">
          <WhyCard
            title="Clarity over shock"
            body="One effective rate removes confusion. If prices feel heavy, this shows why—without blame."
            delay={0}
          />
          <WhyCard
            title="Fairness begins with knowing"
            body="Debate turns honest when everyone sees the same stack: visible + hidden."
            delay={0.05}
          />
          <WhyCard
            title="Built for Nepal"
            body="Conservative defaults for VAT/excise/fuel/telecom pass-through—fully editable."
            delay={0.1}
          />
        </div>
      </section>

      {/* HOW (concise) */}
      <section id="how" className="relative z-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <motion.div
            {...fadeUp(0)}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8"
          >
            <h3 className="text-xl md:text-2xl font-semibold">How it computes</h3>
            <p className="mt-3 text-slate-200/90">
              Estimated Indirect Tax = Σ(Spendᵢ × PassThroughᵢ). Total Tax = Direct + Estimated Indirect.
              Effective Rate = Total Tax / Gross Income. A low–high range is shown using preset tables.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/tax/calculator"
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center"
              >
                Open Calculator
              </a>
              <a
                href="/tax/calculator#advanced"
                className="text-sm underline underline-offset-4 decoration-white/40 hover:decoration-white"
              >
                Jump to Advanced
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer like homepage */}
      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org</p>
            <p className="text-center text-slate-400">Democracy That Flows — Not Stagnates.</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <a href="/tax/calculator" className="hover:text-white">Calculator</a>
              <a href="/polls" className="hover:text-white">Polls</a>
              <a href="/proposals" className="hover:text-white">Proposals</a>
              <a href="/blog" className="hover:text-white">Blog</a>
              <a href="/faq#dao" className="hover:text-white">FAQ</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- UI atoms ---------- */
function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/90">{label}</span>
        <span className="text-white/70">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-300"
        />
      </div>
      {hint && <div className="text-[11px] text-white/60">{hint}</div>}
    </div>
  );
}

function Stat({ title, value, sub, highlight = false }: { title: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          highlight ? "bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-white/60">{sub}</div>}
    </div>
  );
}

function WhyCard({ title, body, delay = 0 }: { title: string; body: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-slate-300/90">{body}</p>
    </motion.div>
  );
}
