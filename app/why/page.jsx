- use client';
-
- import Head from 'next/head'
- import { motion } from 'framer-motion'
- 
- // ...rest of your old code...
+ 'use client'
+
+ import { motion } from 'framer-motion'
+
+ const fadeUp = (delay = 0) => ({
+   hidden: { opacity: 0, y: 14 },
+   show: {
+     opacity: 1,
+     y: 0,
+     transition: { duration: 0.6, ease: 'easeOut', delay }
+   }
+ })
+
+ export default function WhyPage() {
+   return (
+     <main className="min-h-[100svh] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.04),transparent_35%)] text-white">
+       <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
+         <motion.h1
+           initial="hidden"
+           animate="show"
+           variants={fadeUp(0.02)}
+           className="text-3xl sm:text-5xl font-extrabold tracking-tight"
+         >
+           Why Gatishil Nepal
+         </motion.h1>
+
+         <motion.p
+           initial="hidden"
+           animate="show"
+           variants={fadeUp(0.12)}
+           className="mt-4 max-w-3xl text-slate-300/90 leading-relaxed"
+         >
+           Nepal’s old politics worships the throne. We build a people-first
+           rhythm—transparent, cooperative, and alive every day. From Guthi to
+           DAO, the wisdom is old, the tool is new.
+         </motion.p>
+
+         <div className="mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2">
+           <motion.div
+             initial="hidden"
+             whileInView="show"
+             viewport={{ once: true, amount: 0.3 }}
+             variants={fadeUp(0.04)}
+             className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
+           >
+             <h3 className="text-lg font-semibold">💰 Anti-Corruption</h3>
+             <p className="mt-2 text-slate-300/85 text-sm">
+               <span className="font-semibold">Every Rupee Tracked. Every Promise Coded.</span>{' '}
+               Like grain in a clear jar—all can see, none can steal.
+             </p>
+             <p className="mt-2 text-amber-400 text-sm font-medium">
+               The new chauṭarī is not a stage — it’s a shared ledger of trust.
+             </p>
+           </motion.div>
+
+           <motion.div
+             initial="hidden"
+             whileInView="show"
+             viewport={{ once: true, amount: 0.3 }}
+             variants={fadeUp(0.08)}
+             className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
+           >
+             <h3 className="text-lg font-semibold">🤝 Solidarity</h3>
+             <p className="mt-2 text-slate-300/85 text-sm">
+               A bundle of sticks does not break. We organize livelihood, skills,
+               and care into circles that move together.
+             </p>
+             <p className="mt-2 text-amber-400 text-sm font-medium">
+               From Guthi to DAO — the flow is eternal.
+             </p>
+           </motion.div>
+
+           <motion.div
+             initial="hidden"
+             whileInView="show"
+             viewport={{ once: true, amount: 0.3 }}
+             variants={fadeUp(0.12)}
+             className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
+           >
+             <h3 className="text-lg font-semibold">🌍 Transparency</h3>
+             <p className="mt-2 text-slate-300/85 text-sm">
+               Sunlight is policy. Decisions, budgets, and votes live in public,
+               searchable spaces.
+             </p>
+             <p className="mt-2 text-amber-400 text-sm font-medium">
+               Transparency is the revolution; sunlight, our policy.
+             </p>
+           </motion.div>
+
+           <motion.div
+             initial="hidden"
+             whileInView="show"
+             viewport={{ once: true, amount: 0.3 }}
+             variants={fadeUp(0.16)}
+             className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10"
+           >
+             <h3 className="text-lg font-semibold">🛠 Servant Leadership</h3>
+             <p className="mt-2 text-slate-300/85 text-sm">
+               Politics is duty, not business. Leaders eat after the flock, not
+               from it.
+             </p>
+             <p className="mt-2 text-amber-400 text-sm font-medium">
+               We make thrones irrelevant by making people powerful.
+             </p>
+           </motion.div>
+         </div>
+       </section>
+     </main>
+   )
+ }
