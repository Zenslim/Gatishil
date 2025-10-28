'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CTAOrb from '@/components/CTAOrb';
import AudioFlowToggle from '@/components/AudioFlowToggle';
import LowMotionToggle from '@/components/LowMotionToggle';

export default function HeroOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Animated background lives in client to allow styled-jsx */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.08] animated-bg" />

      <div className="pointer-events-auto fixed z-40 top-4 right-4 flex items-center gap-2">
        <AudioFlowToggle />
        <LowMotionToggle />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.85, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
          className="text-xs uppercase tracking-[0.25em] text-amber-300/90"
        >
          Gatishil Nepal
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.9, ease: 'easeOut' }}
          className="mt-2 text-[28px] sm:text-5xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.10)]"
        >
          The DAO Party of the Powerless
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8, ease: 'easeOut' }}
          className="mt-3 text-sm sm:text-lg text-slate-300/90 max-w-2xl"
        >
          Democracy that flows — not stagnates.
        </motion.p>

        <div className="pointer-events-auto mt-8">
          <CTAOrb href="/join?onboarding=1" label="Sit under the Tree" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="mt-6 flex gap-4 text-[12px] text-slate-300/80"
        >
          <Link href="/faq#dao" className="hover:text-white underline underline-offset-4">
            What is a DAO?
          </Link>
          <Link href="/blog" className="hover:text-white underline underline-offset-4">
            Read the Movement
          </Link>
        </motion.div>
      </div>

      <style jsx global>{`
        .animated-bg {
          background: linear-gradient(270deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24);
          background-size: 600% 600%;
          animation: aurora 25s ease infinite;
        }
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
