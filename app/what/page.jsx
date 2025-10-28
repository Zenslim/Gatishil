'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay } }
})

const Section = ({ children, delay = 0 }) => (
  <motion.section
    variants={fadeUp(delay)}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.2 }}
    className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20"
  >
    {children}
  </motion.section>
)

export default function What() {
  const [year] = useState(() => new Date().getFullYear())
  return (
    <main className="min-h-screen bg-[#05060a] text-white selection:bg-amber-300/20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.08)_0,transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06)_0,transparent_35%),radial-gradient(circle_at_30%_80%,rgba(251,191,36,0.08)_0,transparent_40%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28 text-center">
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="text-3xl sm:text-5xl font-semibold tracking-tight">
            What We Are
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.9 }} className="mt-4 sm:mt-6 text-balance text-slate-300/85 text-base sm:text-lg">
            Not a party of faces — a system of trust. A DAO Party of the Powerless.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }} className="mt-8">
            <a href="/why" className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition">
              Read WHY first
            </a>
          </motion.div>
        </div>
      </section>

      {/* DAO Definition */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-semibold">The DAO Party</h2>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <p className="text-slate-300/85">
            <span className="font-semibold text-amber-300/95">Decentralized</span> — power is shared; no one owns the throne.
            <br />
            <span className="font-semibold text-amber-300/95">Autonomous</span> — rules enforce themselves; no backdoor cheating.
            <br />
            <span className="font-semibold text-amber-300/95">Organization</span> — a living system, where each member’s voice strengthens the whole.
          </p>
        </div>
      </Section>

      {/* Nepali Roots */}
      <Section delay={0.06}>
        <h2 className="text-2xl sm:text-3xl font-semibold">Nepali Wisdom, Reborn</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Guthi</h3>
            <p className="mt-2 text-slate-300/85 text-sm">Collective stewardship of land, festivals, and duty — a social smart contract before code.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Bhakari</h3>
            <p className="mt-2 text-slate-300/85 text-sm">A shared grain store: everyone pours, no one starves — our prototype for mutual aid.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Madal</h3>
            <p className="mt-2 text-slate-300/85 text-sm">Rhythm from both sides — harmony emerges when many hands act together.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Bellows</h3>
            <p className="mt-2 text-slate-300/85 text-sm">Every hand feeds the fire — participation is the fuel of transformation.</p>
          </div>
        </div>
        <p className="mt-4 text-slate-300/85">DAO is not foreign. It is Nepali wisdom, rebuilt with modern transparency.</p>
      </Section>

      {/* Identity Blocks */}
      <Section delay={0.1}>
        <h2 className="text-2xl sm:text-3xl font-semibold">Identity & Commitments</h2>
        <ul className="mt-4 space-y-3 text-slate-300/85 text-sm">
          <li>• We are <span className="font-medium">service-first</span>: politics is duty, not salary.</li>
          <li>• We build <span className="font-medium">cooperatives</span>, not cartels: ZenSara, crafts, renewable energy.</li>
          <li>• We keep <span className="font-medium">everything in sunlight</span>: on-chain decisions, public ledgers, visible budgets.</li>
        </ul>
      </Section>

      {/* CTA */}
      <Section delay={0.14}>
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-amber-400/5 p-8 text-center">
          <h3 className="text-2xl font-semibold">We are not a party of faces. We are a system of trust.</h3>
          <p className="mt-3 text-slate-300/85">Stand in the circle. Add your rhythm to the chorus.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="/join" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition">Join now</a>
            <a href="/how" className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition">See how it works</a>
          </div>
        </div>
      </Section>

      <footer className="px-4 sm:px-6 pb-16 text-center text-xs text-slate-400/70">
        © {year} Gatishil Nepal — The DAO Party of the Powerless.
      </footer>
    </main>
  )
}
