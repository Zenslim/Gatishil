// app/tax/page.tsx (Headerless, compelling, thought‑provoking)
'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

/** util: run code only after React mounts (prevents hydration mismatch) */
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.35 },
})

/** Subtle starfield backdrop */
function Starfield() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1])

  return (
    <motion.div style={{ opacity }} className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s" />
        <div className="layer layer-m" />
        <div className="layer layer-l" />
      </div>
      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 60s linear infinite; opacity: .9; }
        .layer-s { background-image: radial-gradient(white 1px,transparent 1.5px), radial-gradient(white 1px,transparent 1.5px); background-size:120px 120px,160px 160px; background-position:0 0,60px 80px; filter: drop-shadow(0 0 1px rgba(255,255,255,.35)); animation-duration: 90s; }
        .layer-m { background-image: radial-gradient(white 1.5px,transparent 2px), radial-gradient(white 1.5px,transparent 2px); background-size:200px 200px,260px 260px; background-position:40px 20px,160px 100px; filter: drop-shadow(0 0 2px rgba(255,255,255,.25)); animation-duration: 120s; }
        .layer-l { background-image: radial-gradient(white 2px,transparent 2.5px), radial-gradient(white 2px,transparent 2.5px); background-size:320px 320px,420px 420px; background-position:120px 60px,260px 180px; filter: drop-shadow(0 0 3px rgba(255,255,255,.2)); animation-duration: 150s; }
        @keyframes drift { 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-2%,-3%,0)} 100%{transform:translate3d(0,0,0)} }
      `}</style>
    </motion.div>
  )
}

export default function TaxLanding() {
  const mounted = useMounted()

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Cosmic gradients */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.9] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      {mounted ? <Starfield /> : null}

      {/* HERO — no header/nav; single, bold opening */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            className="font-extrabold leading-tight text-[32px] sm:text-5xl md:text-6xl"
            {...fadeUp(0)}
          >
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400">
              Nepal True Tax Mirror
            </span>
            <span className="mt-3 block text-slate-200/95 text-lg sm:text-2xl font-semibold">
              The tax you never see is the one you feel.
            </span>
          </motion.h1>

          <motion.p className="mt-4 sm:mt-6 text-slate-300/90 text-base sm:text-lg" {...fadeUp(0.06)}>
            VAT, excise, fuel and telecom levies hide inside prices. Stack the invisible with your
            visible TDS to see your <span className="text-white font-semibold">true effective tax rate</span>.
          </motion.p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center" >
            <motion.a
              href="/tax/calculator"
              whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-2xl bg-amber-400 text-black font-semibold"
              {...fadeUp(0.12)}
            >
              Open Calculator
            </motion.a>
            <motion.a
              href="#problem"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5"
              {...fadeUp(0.16)}
            >
              Why it matters
            </motion.a>
          </div>

          <motion.p className="text-[11px] text-slate-400 mt-3" {...fadeUp(0.18)}>
            No sign‑in. Nothing stored by default. Assumptions are editable.
          </motion.p>
        </div>
      </section>

      {/* PROBLEM (inspired by tax-landing.html) */}
      <section id="problem" className="relative z-10 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-3">
                <h2 className="text-2xl md:text-3xl font-bold text-yellow-300">🕵️ The Problem</h2>
                <p className="mt-3 text-slate-200/90">
                  Nepal collects a large share of revenue from <span className="font-semibold">indirect taxes</span> — VAT, excise,
                  customs and levies. You rarely see them on a payslip, but you feel them in every price tag.
                </p>
                <p className="mt-3 text-slate-200/90">
                  Every grocery run, ride, top‑up and bill quietly funds the state. This page makes that layer visible.
                </p>
              </div>
              <div className="md:col-span-2">
                <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-400/80 p-5 shadow-[0_10px_35px_rgba(244,63,94,.35)] text-center">
                  <div className="text-4xl font-extrabold">77%</div>
                  <div className="mt-1 text-sm opacity-90">of Nepal's tax revenue is indirect</div>
                  <div className="mt-4 text-xs text-white/90">Signal, not verdict. Use the calculator to see your own picture.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          <Feature title="Reveals Hidden Taxes" text="Estimates VAT and excise embedded in daily spending so the invisible layer stops confusing your budget." delay={0} />
          <Feature title="Shows True Rate" text={<>
            Combines visible income tax with the invisible stack to compute your <span className="font-semibold">true effective tax rate</span>.
          </>} delay={0.05} />
          <Feature title="Educates & Empowers" text="Understand where money goes and debate policy with shared facts instead of fog." delay={0.1} />
          <Feature title="Receipt Heatmap" text="See which categories carry the heaviest pass‑through. Adjust assumptions — watch impact live." delay={0.15} />
        </div>
      </section>

      {/* SCENARIOS */}
      <section id="scenarios" className="relative z-10 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h3 className="text-xl md:text-2xl font-semibold text-center" {...fadeUp(0)}>
            📊 See The Impact: Real‑feel Scenarios
          </motion.h3>
          <motion.p className="mt-2 text-center text-slate-300/90" {...fadeUp(0.03)}>
            Based on typical Nepal spending patterns and current rates.
          </motion.p>

          <div className="mt-6 grid md:grid-cols-3 gap-5">
            <Scenario income="NPR 150,000/mo" rate="21.3%" label="Middle‑class professional" total="NPR 32,000" />
            <Scenario income="NPR 300,000/mo" rate="28.3%" label="High‑income earner" total="NPR 85,000" />
            <Scenario income="NPR 80,000/mo" rate="16.9%" label="Lower‑income earner" total="NPR 13,500" />
          </div>
        </div>
      </section>

      {/* HEATMAP + STATS (compact, playful) */}
      <section className="relative z-10 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 items-start">
          <motion.aside className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]" {...fadeUp(0)}>
            <h3 className="text-base sm:text-lg font-semibold">🧾 Receipt Heatmap (demo)</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">Watch where the hidden layer actually sits.</p>
            <div className="mt-3 space-y-4">
              <Bar label="Fuel" value={72} hint="Excise + VAT inside pump price" />
              <Bar label="Telecom" value={38} hint="Service charges embedded" />
              <Bar label="Eating out" value={24} hint="Mostly VATable" />
              <Bar label="Utilities" value={12} hint="Mixed pass‑through" />
            </div>
            <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
              <Stat title="Visible" value="Rs 8,540" sub="TDS + property" />
              <Stat title="Hidden" value="Rs 13,780" sub="VAT + excise est." highlight />
            </div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3, duration: .5 }} className="mt-4 text-sm text-slate-300/80">
              Example only — your real number appears instantly in the calculator.
            </motion.div>
          </motion.aside>

          <motion.div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8" {...fadeUp(0.05)}>
            <h3 className="text-xl md:text-2xl font-semibold">How it computes</h3>
            <p className="mt-3 text-slate-200/90">
              Estimated Indirect Tax = Σ(Spendᵢ × PassThroughᵢ). Total Tax = Direct + Estimated Indirect. Effective Rate = Total Tax / Gross Income.
              A low–high range is shown using preset tables. Assumptions are editable.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/tax/calculator" className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold">Open Calculator</a>
                         </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h3 className="text-2xl md:text-3xl font-extrabold" {...fadeUp(0)}>
            Ready to face the mirror?
          </motion.h3>
          <motion.p className="mt-2 text-slate-300/90" {...fadeUp(0.04)}>
            Stop wondering where the paycheck goes. See your complete tax story.
          </motion.p>
          <motion.a
            href="/tax/calculator"
            whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
            whileTap={{ scale: 0.98 }}
            className="inline-block mt-5 px-6 py-3 rounded-2xl bg-amber-400 text-black font-semibold"
            {...fadeUp(0.08)}
          >
            Calculate My True Tax Rate
          </motion.a>
        </div>
      </section>

      {/* Minimal footer (kept for continuity) */}
      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org · Democracy That Flows</p>
        </div>
      </footer>
    </main>
  )
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
  )
}

function Stat({ title, value, sub, highlight = false }: { title: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-white/60">{sub}</div>}
    </div>
  )
}

function Feature({ title, text, delay = 0 }: { title: string; text: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: .6, delay }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.07]"
    >
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-slate-300/90">{text}</p>
    </motion.div>
  )
}

function Scenario({ income, rate, label, total }: { income: string; rate: string; label: string; total: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: .6 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center"
    >
      <div className="text-xl font-semibold text-teal-300">{income}</div>
      <div className="mt-1 text-3xl font-extrabold text-rose-300">{rate}</div>
      <div className="text-sm opacity-80">True Tax Rate</div>
      <div className="mt-2 text-[13px] opacity-80">{label}</div>
      <div className="mt-1 text-sm"><span className="opacity-80">Total tax </span><strong>{total}</strong></div>
    </motion.div>
  )
}
