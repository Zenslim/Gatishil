'use client'
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

const principles = [
  { title: "Service, not career", text: "Members are already economically independent. Politics is our duty — never our salary." },
  { title: "Cooperatives, not cartels", text: "We build shared ventures — syntropic farms, crafts, wellness, renewable energy. Prosperity that can’t be stolen." },
  { title: "Transparency, not secrecy", text: "Every decision is on-chain; every rupee is visible. Sunlight is the policy." },
  { title: "Daily democracy", text: "We don’t vote once in five years. We participate every day through the digital chauṭarī." },
]

export default function How() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white selection:bg-amber-300/20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.08)_0,transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06)_0,transparent_35%),radial-gradient(circle_at_30%_80%,rgba(251,191,36,0.08)_0,transparent_40%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28 text-center">
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="text-3xl sm:text-5xl font-semibold tracking-tight">
            How We Work
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.9 }} className="mt-4 sm:mt-6 text-balance text-slate-300/85 text-base sm:text-lg">
            Daily participation, shared wealth, and sunlight-by-default ledgers.
          </motion.p>
        </div>
      </section>

      {/* Operating Principles */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-semibold">Operating Principles</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {principles.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp(0.02)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition"
            >
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-slate-300/85 text-sm">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* The Digital Chauṭarī */}
      <Section delay={0.06}>
        <h2 className="text-2xl sm:text-3xl font-semibold">The Digital Chauṭarī</h2>
        <p className="mt-4 text-slate-300/85">
          The people’s square — an always-on interface for proposals, budgets, votes, and coordination.
          Not a stage for speeches, but a <span className="text-amber-300/95 font-medium">shared ledger of trust</span>.
        </p>
        <ul className="mt-4 space-y-2 text-slate-300/85 text-sm">
          <li>• Open proposals with clear costs and timelines.</li>
          <li>• Public votes with verifiable tallies.</li>
          <li>• Task boards and bounties for doers.</li>
        </ul>
      </Section>

      {/* Trust Step (PIN) */}
      <Section delay={0.1}>
        <h2 className="text-2xl sm:text-3xl font-semibold">Trust, Bound to Your Device</h2>
        <p className="mt-4 text-slate-300/85">
          After introductions, we invite you to seal your voice to your device with a 4–8 digit PIN.
          It makes returning effortless and keeps your presence grounded to this device.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <p className="text-amber-300/90 text-sm sm:text-base font-medium">
            Your secret stays on your device. The PIN is all you need when biometrics aren’t available.
          </p>
        </div>
        <div className="mt-6">
          <a href="/onboard?src=join&step=trust" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition">
            Set up device trust
          </a>
        </div>
      </Section>

      {/* Economy & Culture First */}
      <Section delay={0.14}>
        <h2 className="text-2xl sm:text-3xl font-semibold">Economy & Culture First → Politics Later</h2>
        <p className="mt-4 text-slate-300/85">
          We move wealth-creation and culture-building to the front: <span className="font-medium">Pasaguthi</span> (roots & mycelium) and <span className="font-medium">ZenSara</span> (soil & seed).
          When roots deepen and soil becomes fertile, the Janmandal forms naturally, and politics becomes expression — not competition.
        </p>
      </Section>

      {/* CTA */}
      <Section delay={0.18}>
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-amber-400/5 p-8 text-center">
          <h3 className="text-2xl font-semibold">Be a hand in the rhythm.</h3>
          <p className="mt-3 text-slate-300/85">Participate daily, in sunlight. Build the parallel life with us.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="/join" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition">Join now</a>
            <a href="/what" className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition">Understand the identity</a>
          </div>
        </div>
      </Section>

      <footer className="px-4 sm:px-6 pb-16 text-center text-xs text-slate-400/70">
        © {new Date().getFullYear()} Gatishil Nepal — The DAO Party of the Powerless.
      </footer>
    </main>
  )
}
