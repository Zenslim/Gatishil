'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function WuWeiLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col items-center px-6 py-20 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl md:text-6xl font-semibold mb-4 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent"
      >
        Wu-Wei Cooperative OS
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="max-w-2xl text-lg md:text-xl text-gray-300 leading-relaxed"
      >
        A full-stack transparent operating system for cooperatives — 
        born from the <span className="text-amber-400">philosophy of effortless action</span>.
        Every rupee, vote, and voice flows under the sunlight of truth.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 grid gap-8 md:grid-cols-3 w-full max-w-5xl"
      >
        <FeatureCard
          title="🌞 Sunlight Dials"
          text="Real-time dashboard of posting delay, reversal rate, and community vitality — the cooperative’s heartbeat made visible."
        />
        <FeatureCard
          title="🔒 Three Tiny Locks"
          text="Every spend links to a proposal, requires two approvals, and pays only verified public payees. Manipulation becomes pointless."
        />
        <FeatureCard
          title="🧩 Append-Only Truth"
          text="All actions generate immutable SHA-256 audit entries, verified nightly by cryptographic proofs — history you can trust."
        />
      </motion.div>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="mt-20 max-w-3xl"
      >
        <h2 className="text-3xl font-semibold text-amber-400 mb-4">🚀 Status</h2>
        <p className="text-gray-300 text-lg leading-relaxed">
          <strong>Backend:</strong> Fully deployed on Supabase with 10 tables, RLS, and edge functions.<br />
          <strong>Frontend:</strong> Next.js 16 + TailwindCSS, bilingual (English / नेपाली).<br />
          <strong>Deployment:</strong> Ready for Vercel — one command away.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-20 max-w-4xl text-gray-300"
      >
        <h2 className="text-3xl font-semibold text-amber-400 mb-4">🧠 Wu-Wei in Practice</h2>
        <p className="text-lg leading-relaxed">
          Transparency replaces control. Community eyes keep life honest. 
          Physics, not authority, secures every transaction. 
          The system governs itself — like water finding its level.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="mt-20"
      >
        <Link href="/en/dashboard">
          <button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-lg px-8 py-4 rounded-xl shadow-lg shadow-amber-500/20 transition">
            Open Sunlight Dashboard
          </button>
        </Link>
        <p className="text-gray-400 text-sm mt-3">Experience the heartbeat of transparency</p>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6 }}
        className="mt-24 text-gray-500 text-xs"
      >
        © {new Date().getFullYear()} Gatishil Nepal · Wu-Wei Cooperative OS
      </motion.footer>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
      <h3 className="text-2xl font-semibold text-amber-400 mb-2">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
