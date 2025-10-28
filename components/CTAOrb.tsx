'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CTAOrb({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group relative inline-flex items-center justify-center">
      <motion.span
        className="relative z-10 px-6 py-3 rounded-full bg-amber-400 text-black font-semibold"
        initial={{ scale: 0.98 }}
        animate={{ boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 34px rgba(251,191,36,0.45)'] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {label}
      </motion.span>
      <span className="absolute -inset-3 rounded-full bg-amber-400/20 blur-2xl group-hover:bg-amber-400/30 transition" />
    </Link>
  );
}
