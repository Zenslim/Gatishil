// app/page.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import ClientOnly from '@/components/ClientOnly';

/** util: run code only after React mounts (prevents hydration mismatch) */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Section title */
function SectionTitle(props: { id?: string; kicker?: string; title: string; subtitle?: string }) {
  const { id, kicker, title, subtitle } = props;
  return (
    <div id={id} className="text-center max-w-3xl mx-auto mb-8 px-2">
      {kicker && <p className="uppercase tracking-widest text-[10px] text-amber-300/85">{kicker}</p>}
      <h2 className="text-2xl sm:text-3xl font-bold mt-2">{title}</h2>
      {subtitle && <p className="text-sm sm:text-base text-slate-300/85 mt-3">{subtitle}</p>}
    </div>
  );
}

/** Subtle starfield that fades in on scroll */
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

// Replace your DaoWord with this version (supports gradient via className)
function DaoWord({ className = "" }: { className?: string }) {
  return (
    <a href="/faq#dao" className="relative group cursor-help focus:outline-none">
      <span
        className={`underline decoration-dotted underline-offset-2 ${className}`}
        aria-describedby="dao-tooltip"
        tabIndex={0}
      >
        DAO
      </span>
      <span
        id="dao-tooltip"
        role="tooltip"
        className="pointer-events-none absolute left-0 top-[125%] w-[280px] sm:w-[320px] rounded-xl border border-white/15 bg-zinc-900/95 px-3 py-3 text-[11px] text-slate-200 shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0 transition"
      >
        <span className="block text-[11px] font-semibold text-amber-300">
          DAO = Decentralized Autonomous Organization
        </span>
        <span className="block mt-1">Decentralized → Power is shared, no one owns the throne.</span>
        <span className="block">Autonomous → Rules enforce themselves, no backdoor cheating.</span>
        <span className="block">Organization → A living system, where each member’s voice adds to the whole.</span>
        <span className="block mt-2 text-amber-300 underline underline-offset-4">Click to read more →</span>
      </span>
    </a>
  );
}

export default function HomePage() {
  const mounted = useMounted();

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>

      <ClientOnly>{mounted ? <Starfield /> : null}</ClientOnly>

      {/* HERO (global Nav is rendered by layout.tsx now) */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          {/* Left text */}
          <div className="lg:col-span-7">
            <motion.span
              className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full"
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6 } }} viewport={{ once: true }}
            >
              GatishilNepal.org
            </motion.span>

            <motion.h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.05 }}}
              viewport={{ once: true }}
            >
              The <DaoWord className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400" /> Party of the Powerless.
            </motion.h1>

            <motion.p className="mt-4 text-slate-300/90 text-xl sm:text-2xl font-bold max-w-2xl"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.1 }}}
              viewport={{ once: true }}
            >
              Service, Not Career. Community, Not Power.
            </motion.p>

            <motion.p className="mt-2 text-slate-300/90 text-sm sm:text-base max-w-2xl"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.14 }}}
              viewport={{ once: true }}
            >
              Not another party of faces, but a movement that makes thrones irrelevant.
              Live free without fear. Create together. Restore the flow. Rise as one.
            </motion.p>

            {/* CTAs */}
            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <motion.a
                href="/join"
                whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition"
                initial={false}
              >
                Join Us to Restore the Flow
              </motion.a>
              <motion.a
                href="#manifesto"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
                initial={false}
              >
                Read Our Manifesto
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-400 mt-3"
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.18 }}}
              viewport={{ once: true }}
            >
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </div>

          {/* Right: Daily Pulse */}
          <motion.aside
            className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]"
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.18 }}}
            viewport={{ once: true }}
          >
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
              Gatishil moves every day — small decisions, big rhythm.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-[11px]">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-300/80 text-[11px]">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Review →</a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-slate-300/80">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* MANIFESTO — 8 Blocks */}
      <section className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <SectionTitle
            id="manifesto"
            kicker="Manifesto"
            title="The Power of the Powerless"
            subtitle="Eight vows to give Nepal back to its people."
          />

          <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1 Courage */}
            <motion.div {...fadeUp(0.02)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🔥 Courage — Awaken the Giant
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Stop accepting helplessness. Our strength is immense but sleeping.</li>
                <li>• The elephant forgets its power when it believes the rope is unbreakable.</li>
                <li>• The mightiest river begins as a forgotten spring.</li>
                <li>• The system sells fear; we return to the flow.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 Will we keep living as captives when we were born as giants?</p>
            </motion.div>

            {/* 2 Livelihood */}
            <motion.div {...fadeUp(0.04)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🌱 Livelihood — Root Our Economy
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>True prosperity is self-reliance, not borrowed survival.</li>
                <li>• You cannot build a house on borrowed bricks.</li>
                <li>• Eat from your own harvest; no one can buy your hunger.</li>
                <li>• Work is dignity; dependence is chains.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 Why beg for bread when our earth still waits for seed?</p>
            </motion.div>

            {/* 3 Justice */}
            <motion.div {...fadeUp(0.06)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                ⚖️ Justice — Truth Has No Master
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>The law must be blind, especially to the powerful.</li>
                <li>• If the fence eats the crops, who protects the field?</li>
                <li>• The scale must be balanced, not for sale.</li>
                <li>• Fairness is not charity; it is our birthright.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 Who will guard the people if justice itself is sold?</p>
            </motion.div>

            {/* 4 Transparency */}
            <motion.div {...fadeUp(0.08)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🌍 Transparency — Light Belongs to All
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Every rupee should shine, every decision be seen.</li>
                <li>• Darkness hides thieves; light protects the people.</li>
                <li>• Muddy water hides fish; clear water builds trust.</li>
                <li>• The sun never left, we just closed our eyes</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 A leader who fears light has already betrayed the people.</p>
            </motion.div>

            {/* 5 Solidarity */}
            <motion.div {...fadeUp(0.1)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🤝 Solidarity — Bundle the Sticks
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Our unity is our only undeniable strength.</li>
                <li>• One stick breaks; a bundle does not.</li>
                <li>• One drum sounds hollow; many drums shake the earth.</li>
                <li>• Alone we are prey; together we are thunder.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 Why fight alone when together we can shake the sky?</p>
            </motion.div>

            {/* 6 Servitude */}
            <motion.div {...fadeUp(0.12)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🛠 Servitude — Eat After the People
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Leadership is service, not reward. Politics is duty, not business.</li>
                <li>• The true shepherd eats after the flock, not from it.</li>
                <li>• Power is not ownership; it is responsibility.</li>
                <li>• To serve is to see the divine in every citizen.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 What kind of leader feasts while their people starve?</p>
            </motion.div>

            {/* 7 Culture */}
            <motion.div {...fadeUp(0.14)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                🎶 Culture — Every Voice Sings
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Many Rivers, One Flow — The United Soul of Nepal.</li>
                <li>• Crafted by many, mastered by none.</li>
                <li>• We are not a solo; we are a chorus.</li>
                <li>• Diversity is our strength — many notes, one harmony.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 What happens to a nation when it forgets its own tune?</p>
            </motion.div>

            {/* 8 Freedom */}
            <motion.div {...fadeUp(0.16)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                ❤️ Freedom — Remember the Sky
              </h3>
              <ul className="mt-2 space-y-2 text-slate-300/85 text-sm">
                <li>Freedom is our natural state; we’ve just forgotten its taste.</li>
                <li>• The throne survives only if we keep bowing.</li>
                <li>• A bird in a cage forgets the sky until it flies.</li>
                <li>• Freedom is not a privilege; it is the air we breathe.</li>
              </ul>
              <p className="mt-3 text-amber-200 text-xs sm:text-sm">🤔 Why beg for light while standing under the sun?</p>
            </motion.div>
          </div>

          <p className="mt-8 text-center text-[16px] text-slate-400">
            Keep your vows in your heart, but navigate the world with your eyes wide open to its realities.
          </p>
        </div>
      </section>

      {/* OUR FOUR STONES */}
      <section className="relative z-10 pb-10 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <SectionTitle
            kicker="Foundations"
            title="Four Stones, One River"
            subtitle="The path where democracy flows, not stagnates."
          />

          <div className="max-w-5xl mx-auto grid gap-4 sm:gap-6 sm:grid-cols-2">
            <motion.div {...fadeUp(0.02)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🗳 Tech-Forward Campaigns</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">Your Voice, Coded in Trust.</span> Like dropping your vote in a box everyone can see, but no one can steal.
              </p>              <p className="mt-2 text-amber-400 text-sm font-medium">
  The new chauṭarī is not a stage, it’s a shared ledger of trust.
</p>
            </motion.div>

            <motion.div {...fadeUp(0.04)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">💰 Anti-Corruption</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">Every Rupee Tracked. Every Promise Coded.</span> Like grain in a clear jar — all can see, none can steal.
 </p>  <p className="mt-2 text-amber-400 text-sm font-medium">
    Transparency is the new revolution; sunlight, our policy.
  </p>
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">🌱 Grassroots Mobilization</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">The Party is You. The Mandate is Ours.</span> Like a shared khet where every farmer plants, no harvest unless all work.
              </p>   <p className="mt-2 text-amber-400 text-sm font-medium">
    This is not representation, this is participation.
  </p>
            </motion.div>

            <motion.div {...fadeUp(0.08)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold">📜 Philosophical Foundation</h3>
              <p className="mt-2 text-slate-300/85 text-sm">
                <span className="font-semibold">The People’s Code. The Nation’s Flow.</span> Like ancient guthi rules, but written in code — fair, tamper-proof, shared by all.
              </p>   <p className="mt-2 text-amber-400 text-sm font-medium">
    From Guthi to DAO — the wisdom is old, the tool is new, the flow eternal.
  </p>
            </motion.div>
          </div>
       <p className="mt-8 text-center text-[16px] text-slate-400">
            A prince must combine the qualities of a lion and a fox.
          </p>  
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org</p>
            <p className="text-center text-slate-400">Democracy That Flows — Not Stagnates.</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <a href="/join" className="hover:text-white">Join</a>
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
