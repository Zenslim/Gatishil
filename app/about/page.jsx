'use client'

import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }
  }
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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white selection:bg-amber-300/20">

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.08)_0,transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06)_0,transparent_35%),radial-gradient(circle_at_30%_80%,rgba(251,191,36,0.08)_0,transparent_40%)]"/>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-5xl font-semibold tracking-tight"
          >
            About Gatishil Nepal
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.9 }}
            className="mt-4 sm:mt-6 text-balance text-slate-300/85 text-base sm:text-lg"
          >
            A movement built on Inner Honesty, Transparent Systems, and People Working Together.
          </motion.p>
        </div>
      </section>

      {/* WHY WE EXIST */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-semibold">WHY We Exist</h2>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4">
          <p className="text-slate-300/85">
            Nepal’s politics has become a business. Leaders fight for chairs, not for people.
            Promises come during elections. After that, everyone is forgotten.
          </p>

          <p className="text-slate-300/85">
            But real change does not start in Kathmandu.  
            Real change begins <span className="font-medium text-amber-300/90">inside the people</span>.
          </p>

          <p className="text-slate-300/85">
            When a person becomes clear and honest, they cannot be fooled or bought.
            If the citizen becomes strong, the system becomes clean.
          </p>

          <p className="text-slate-300/85">
            Gatishil Nepal exists to awaken honesty in people, rebuild community power,
            and create a system that no one can corrupt.
          </p>
        </div>
      </Section>

      {/* WHAT WE ARE */}
      <Section delay={0.06}>
        <h2 className="text-2xl sm:text-3xl font-semibold">WHAT We Are</h2>

        <p className="mt-4 text-slate-300/85 leading-relaxed">
          We are not a party of big faces.  
          We are a <span className="font-medium text-amber-300/90">system of trust</span>,
          built by everyday people who want honesty, fairness, and unity.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold">Guthi</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              Our old Nepali way of working together, protecting each other, and solving problems as one.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold">Bhakari</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              A shared grain store. Everyone pours, no one starves. A culture of mutual help.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold">Chautārī</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              Our first parliament. Sitting together, talking openly, deciding fairly.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-semibold">Rhythm</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              Like a madal — when many hands act together, harmony grows.
            </p>
          </div>
        </div>

        <p className="mt-6 text-slate-300/85 leading-relaxed">
          Gatishil Nepal is these old Nepali values, rebuilt with simple modern tools
          so they can help the whole country.
        </p>
      </Section>

      {/* HOW WE WORK */}
      <Section delay={0.12}>
        <h2 className="text-2xl sm:text-3xl font-semibold">HOW We Work</h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <motion.div
            variants={fadeUp(0.02)}
            initial="hidden"
            whileInView="show"
            className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-lg font-semibold">Daily Participation</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              People can share ideas and vote any day, not only during elections.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp(0.04)}
            initial="hidden"
            whileInView="show"
            className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-lg font-semibold">Open Records</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              All money collected and spent is visible to everyone. No secret accounts.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp(0.06)}
            initial="hidden"
            whileInView="show"
            className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-lg font-semibold">Shared Livelihood</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              Villages build cooperatives in farming, crafts, forests, and small industries.
              When the village grows, every family grows.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp(0.08)}
            initial="hidden"
            whileInView="show"
            className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-lg font-semibold">Service Leadership</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              Leaders eat last. Leaders serve first. Politics is duty, not salary.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp(0.10)}
            initial="hidden"
            whileInView="show"
            className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 sm:col-span-2"
          >
            <h3 className="text-lg font-semibold">Simple Technology</h3>
            <p className="mt-2 text-slate-300/85 text-sm">
              A basic phone is enough. Your device becomes your identity for participation.
              No difficult apps. Easy for all.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* CTA */}
      <Section delay={0.16}>
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-amber-400/5 p-8 text-center">
          <h3 className="text-2xl font-semibold">This is a movement of action, truth, and cooperation.</h3>
          <p className="mt-3 text-slate-300/85">Stand with us. Build the future with your own hands.</p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="/join"
              className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition"
            >
              Join now
            </a>
            <a
              href="/how"
              className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition"
            >
              Learn more
            </a>
          </div>
        </div>
      </Section>

      <footer className="px-4 sm:px-6 pb-16 text-center text-xs text-slate-400/70">
        © {new Date().getFullYear()} Gatishil Nepal — Inner Honesty → Outer Integrity.
      </footer>
    </main>
  )
}
