'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CooperativePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col items-center justify-center text-center px-6 py-20">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl md:text-6xl font-semibold mb-4 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent"
      >
        The Gatishil Cooperative
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="max-w-2xl text-lg md:text-xl leading-relaxed text-gray-300"
      >
        Where <span className="text-amber-400">work, wealth, and wisdom</span> flow together.  
        Our members are not employees or followers — they are co-owners of a living system.  
        Every action, transaction, and harvest shines under the sunlight of truth.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10 grid gap-6 md:grid-cols-3 w-full max-w-5xl"
      >
        <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
          <h2 className="text-2xl font-semibold text-amber-400 mb-2">🌾 Cooperative Model</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Every member invests time, skill, or capital.  
            Profits return to all — not as salary, but as shared dignity.
          </p>
        </div>

        <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
          <h2 className="text-2xl font-semibold text-amber-400 mb-2">💧 Transparency</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            All ledgers are open. Every rupee, vote, and decision is visible to members.  
            Corruption ends where sunlight begins.
          </p>
        </div>

        <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
          <h2 className="text-2xl font-semibold text-amber-400 mb-2">🌍 Collective Action</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            We grow forests, not factories.  
            Each project feeds the soil, the family, and the nation.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-16"
      >
        <Link href="/join">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black text-lg px-8 py-6 rounded-xl shadow-lg shadow-amber-500/20">
            Join the Cooperative
          </Button>
        </Link>

        <p className="text-gray-400 text-sm mt-4">
          Transparent. Decentralized. Gatishil.
        </p>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="mt-24 text-gray-500 text-xs"
      >
        © {new Date().getFullYear()} Gatishil Nepal — The DAO Party of the Powerless
      </motion.footer>
    </main>
  );
}
