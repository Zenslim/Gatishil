'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

/**
 * Gatishil — Home (Hero + Principles, final)
 * - Cosmic gradient + starfield
 * - Only two CTAs: "Read the Principles" and "Our Insights"
 * - ELI15 structure, bold, thought-provoking copy
 * - Remote-only stack: Next.js + Tailwind + Vercel + Supabase (no local steps)
 */

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.85, 0.75]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -30]);

  return (
    <main ref={ref} className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Cosmic backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_700px_at_50%_-200px,rgba(80,130,255,0.25),transparent_70%)]" />
        <StarField />
        <div className="absolute inset-0 bg-[radial-gradient(800px_600px_at_10%_110%,rgba(0,180,150,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_650px_at_90%_120%,rgba(220,90,255,0.15),transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="relative z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3">
            {/* Optional logo if present in /public */}
            <div className="h-8 w-8 rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur" />
            <span className="text-lg font-semibold tracking-wide">Gatishil Loktantric Party</span>
          </div>

          {/* Only two CTAs on the right */}
          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              href="#principles"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Read the Principles
            </Link>
            <Link
              href="/insights"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
            >
              Our Insights
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        style={{ opacity, y }}
        className="relative z-10 mx-auto grid w-full max-w-6xl items-center px-4 pt-16 md:grid-cols-12 md:gap-8 md:px-6 md:pt-24"
      >
        <div className="md:col-span-7">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-balance text-4xl font-extrabold leading-tight md:text-6xl"
          >
            The DAO Party of the Powerless.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6, ease: 'easeOut' }}
            className="mt-4 max-w-2xl text-pretty text-lg text-white/85 md:text-xl"
          >
            We don’t chase thrones. We make them irrelevant. Culture + Economics first → Politics
            later. Daily, living democracy — not silence between elections.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, type: 'spring', stiffness: 140, damping: 16 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="#principles"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Read the Principles
            </Link>
            <Link
              href="/insights"
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Our Insights
            </Link>
          </motion.div>

          <p className="mt-6 text-sm text-white/60">
            ELI15: We build roots (culture) and soil (economics) first, so politics serves people —
            not donors.
          </p>
        </div>

        {/* Side highlight */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
          className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-inset ring-white/10 backdrop-blur md:col-span-5 md:mt-0"
        >
          <h3 className="text-base font-semibold">Why only two buttons?</h3>
          <p className="mt-2 text-sm text-white/80">
            Clarity wins. “Read the Principles” (truth), “Our Insights” (proof). Delete
            “Why/What/How” buttons — fewer choices, stronger action.
          </p>
        </motion.aside>
      </motion.section>

      {/* Principles */}
      <section id="principles" className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-16 md:px-6 md:pb-28">
        <div className="grid gap-6 md:grid-cols-3">
          <Card
            title="1) Why We Exist"
            lines={[
              'Rulers turned power into a private guthi.',
              'Their greed taught us: every lie sparks fire.',
              'We are that fire — not the ashes, but the dawn.',
            ]}
          />
          <Card
            title="2) What We Are"
            lines={[
              'We are not faces; we are a rhythm — a DAO.',
              'DAO = Nepali wisdom reborn in code (Guthi, Bhakari, Madal).',
              'Power shared. Rules enforce themselves.',
            ]}
          />
          <Card
            title="3) How We Work"
            lines={[
              'Politics = duty, not salary.',
              'Members stand on independent livelihoods (farms, crafts, diaspora, co-ops).',
              'Every decision on-chain, open as the sky.',
            ]}
          />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card
            title="4) The Order of Life"
            lines={[
              'Roots (culture) + soil (economics) → trunk (governance).',
              'Culture is the immune system of a nation.',
              'Economics + Culture first → Politics later.',
            ]}
          />
          <Card
            title="5) A Democracy That Moves"
            lines={[
              'Old democracy: one vote, five years of silence.',
              'Gatishil: alive every day — youth in every decision.',
              'Digital chauṭarī; accountability is immediate.',
            ]}
          />
        </div>

        <Callout />
      </section>

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Gatishil Loktantric Party — The DAO Party of the Powerless
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="#principles"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Read the Principles
            </Link>
            <Link
              href="/insights"
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
            >
              Our Insights
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* --- UI Pieces --- */

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-inset ring-white/10 backdrop-blur"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/85">
        {lines.map((l, i) => (
          <li key={i} className="leading-relaxed">
            • {l}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

function Callout() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.05, duration: 0.6, ease: 'easeOut' }}
      className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 text-center ring-1 ring-inset ring-white/10 backdrop-blur"
    >
      <p className="text-pretty text-base leading-relaxed text-white/90 md:text-lg">
        <span className="block font-semibold">
          We are the contradiction their folly created.
        </span>
        <span className="block">
          We are the spark that grows from their failure. And the rhythm has already begun.
        </span>
      </p>
    </motion.div>
  );
}

function StarField({ count = 140 }: { count?: number }) {
  // Lightweight, static starfield (no canvas needed)
  const stars = Array.from({ length: count }).map((_, i) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const size = Math.random() * 1.8 + 0.4;
    const opacity = Math.random() * 0.7 + 0.3;
    const delay = Math.random() * 6;
    const dur = Math.random() * 6 + 4;
    return { i, top, left, size, opacity, delay, dur };
  });

  return (
    <div aria-hidden className="absolute inset-0">
      {stars.map((s) => (
        <span
          key={s.i}
          className="absolute rounded-full bg-white/90 shadow-[0_0_8px_2px_rgba(255,255,255,0.35)]"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <style jsx global>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0px) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-0.6px) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
