use client';

import Head from 'next/head'
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

const vows = [
  { icon: "🔥", title: "Courage", text: "Stop accepting helplessness. The elephant rope snaps when we remember our strength." },
  { icon: "🌱", title: "Livelihood", text: "Build on your own soil. Eat from your own harvest; no one can buy your hunger." },
  { icon: "⚖️", title: "Justice", text: "Judge the judge. If the fence eats the crops, who protects the field?" },
  { icon: "🌍", title: "Transparency", text: "Let sunlight be the policy. A thief hides in darkness; sunlight heals the nation." },
  { icon: "🤝", title: "Solidarity", text: "Bundle the sticks. Alone we are prey; together we shake the sky." },
  { icon: "🛠", title: "Servitude", text: "Serve, don’t rule. Power is not ownership; it is responsibility." },
  { icon: "🎶", title: "Culture", text: "Every voice sings. We are not a solo — we are a chorus." },
  { icon: "❤️", title: "Freedom", text: "Dare to fly. A throne looks powerful only while we kneel." }
]

export default function Why() {
  return (
    <>
      <Head>
        <title>Why — Gatishil Nepal</title>
        <meta name="description" content="Why Gatishil exists: a DAO party for the powerless, building a parallel life where economy and culture come first." />
      </Head>

      <main className="min-h-screen bg-[#05060a] text-white selection:bg-amber-300/20">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.08)_0,transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06)_0,transparent_35%),radial-gradient(circle_at_30%_80%,rgba(251,191,36,0.08)_0,transparent_40%)]" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28 text-center">
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="text-3xl sm:text-5xl font-semibold tracking-tight">
              Why We Exist
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.9 }} className="mt-4 sm:mt-6 text-balance text-slate-300/85 text-base sm:text-lg">
              Not to compete for a throne — but to make thrones irrelevant.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }} className="mt-8 flex items-center justify-center gap-3">
              <a href="/join" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition">
                Join the rhythm
              </a>
              <a href="/manifesto" className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition">
                Read the manifesto
              </a>
            </motion.div>
          </div>
        </section>

        {/* Sections */}
        <Section>
          <h2 className="text-2xl sm:text-3xl font-semibold">The Spark</h2>
          <p className="mt-4 text-slate-300/85">
            Nepal has been ruled by men who treat power like their personal guthi — inherited, hoarded, and fenced from the people.
            They fed themselves, not the soil. But every time they failed, the earth remembered.
          </p>
          <p className="mt-3 text-slate-300/85">
            Their greed awakened a generation. Their silence made us speak. Their collapse became our spark. We are that spark —
            the Gatishil Movement, the DAO Party of the Powerless.
          </p>
        </Section>

        <Section delay={0.05}>
          <h2 className="text-2xl sm:text-3xl font-semibold">The Old System is Dying</h2>
          <p className="mt-4 text-slate-300/85">
            Elections every few years, corruption every day. Politics became a career; democracy became a market of slogans.
            They sold us pain, then sold us hope. True power is not taken — it is reclaimed.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <p className="text-amber-300/90 text-sm sm:text-base font-medium">
              The new chautari is not a stage, it’s a shared ledger of trust. Transparency is the new revolution; sunlight, our policy.
            </p>
          </div>
        </Section>

        <Section delay={0.1}>
          <h2 className="text-2xl sm:text-3xl font-semibold">The Parallel Life Begins Here</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h3 className="text-lg font-semibold">Pasaguthi — Roots & Mycelium</h3>
              <p className="mt-2 text-slate-300/85 text-sm">A digital guthi that reconnects scattered sons and daughters of Nepal. Trust, heritage, and solidarity woven across the world.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <h3 className="text-lg font-semibold">ZenSara — Soil & Seed</h3>
              <p className="mt-2 text-slate-300/85 text-sm">A living model of cooperative wealth — syntropic farms, wellness hubs, crafts, and renewable energy. We grow prosperity that cannot be stolen.</p>
            </div>
          </div>
          <p className="mt-4 text-slate-300/85">Together they form a life the system cannot corrupt — a wealth the state cannot tax with fear.</p>
        </Section>

        <Section delay={0.15}>
          <h2 className="text-2xl sm:text-3xl font-semibold">The Powerless Rise — Eight Vows</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vows.map((v) => (
              <motion.div key={v.title} variants={fadeUp(0.02)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition">
                <div className="text-2xl">{v.icon}</div>
                <h3 className="mt-2 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-slate-300/85 text-sm">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Section delay={0.18}>
          <h2 className="text-2xl sm:text-3xl font-semibold">A New Democracy That Moves</h2>
          <p className="mt-4 text-slate-300/85">
            Our democracy is not static — it is <span className="text-amber-300/95 font-medium">Gatishil</span>, alive every day.
            Youth vote not once in five years, but in every decision. Technology becomes the new <span className="font-medium">chauṭarī</span> — the open square of truth.
          </p>
          <ul className="mt-4 space-y-2 text-slate-300/85 text-sm">
            <li>• Every rupee tracked. Every promise coded.</li>
            <li>• Every citizen visible, every voice verified.</li>
            <li>• Service over career. Duty over business.</li>
          </ul>
        </Section>

        <Section delay={0.22}>
          <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-amber-400/5 p-8 text-center">
            <h3 className="text-2xl font-semibold">The rhythm has already begun.</h3>
            <p className="mt-3 text-slate-300/85">We are not here to compete. We are here to live — and when we move, Nepal moves.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <a href="/join" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-5 py-2.5 text-amber-300 text-sm font-medium transition">Begin under the tree</a>
              <a href="/onboard?src=join&step=atmadisha" className="rounded-2xl border border-white/15 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200/90 transition">Find your Ātma Diśā</a>
            </div>
          </div>
        </Section>

        <footer className="px-4 sm:px-6 pb-16 text-center text-xs text-slate-400/70">
          © {new Date().getFullYear()} Gatishil Nepal — The DAO Party of the Powerless.
        </footer>
      </main>
    </>
  )
}
