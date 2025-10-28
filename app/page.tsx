'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ClientOnly from '@/components/ClientOnly';

/* -------------------------------------------------------
   Minimal motion hooks/utilities
------------------------------------------------------- */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.35 },
});

/* -------------------------------------------------------
   1) Entry Portal (2s). A heartbeat spark + glow that fades out.
------------------------------------------------------- */
function EntryPortal() {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHide(true), 2000);
    return () => clearTimeout(t);
  }, []);
  if (hide) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.6, duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0.95 }}
        animate={{ scale: [0.95, 1.04, 1.0] }}
        transition={{ times: [0, 0.5, 1], duration: 1.6, ease: 'easeInOut' }}
      >
        <div className="h-24 w-24 rounded-full bg-amber-300 blur-sm opacity-70" />
        <div className="absolute inset-0 rounded-full ring-2 ring-amber-400/80 animate-ping-slow" />
      </motion.div>
      <style jsx global>{`
        @keyframes ping-slow {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.25); opacity: 0.05; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 1.6s cubic-bezier(0,0,0.2,1) infinite; }
      `}</style>
    </motion.div>
  );
}

/* -------------------------------------------------------
   2) MandalaCanvas: rotating lines + twinkling nodes (GPU-cheap).
      - No images, no assets. ~0kb.
------------------------------------------------------- */
function MandalaCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext('2d')!;
    let w = (canvas.width = Math.floor(canvas.clientWidth * dpr));
    let h = (canvas.height = Math.floor(canvas.clientHeight * dpr));
    const center = { x: w / 2, y: h / 2 };

    const onResize = () => {
      w = canvas.width = Math.floor(canvas.clientWidth * dpr);
      h = canvas.height = Math.floor(canvas.clientHeight * dpr);
      center.x = w / 2; center.y = h / 2;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    // Precompute radii and angles
    const rings = 6;
    const spokes = 40;
    const maxR = Math.min(w, h) * 0.42;
    const radii = Array.from({ length: rings }, (_, i) => (maxR * (i + 1)) / rings);
    const nodes: { x: number; y: number; tw: number; phase: number }[] = [];

    for (let r of radii) {
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        nodes.push({
          x: center.x + Math.cos(a) * r,
          y: center.y + Math.sin(a) * r,
          tw: 0.6 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let t0 = performance.now();
    const draw = (t: number) => {
      const dt = (t - t0) / 1000;
      t0 = t;

      // background clear (transparent for layering)
      ctx.clearRect(0, 0, w, h);

      // rotate slowly
      const rot = t * 0.00006 * Math.PI * 2;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(rot);
      ctx.translate(-center.x, -center.y);

      // lines
      ctx.strokeStyle = 'rgba(255,215,128,0.13)';
      ctx.lineWidth = Math.max(1, 0.75 * dpr);
      ctx.beginPath();
      // spokes
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        ctx.moveTo(center.x + Math.cos(a) * radii[0], center.y + Math.sin(a) * radii[0]);
        ctx.lineTo(center.x + Math.cos(a) * radii[radii.length - 1], center.y + Math.sin(a) * radii[radii.length - 1]);
      }
      // rings
      for (let r of radii) {
        ctx.moveTo(center.x + r, center.y);
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      }
      ctx.stroke();

      // nodes (twinkle)
      for (let n of nodes) {
        const twinkle = (Math.sin(t * 0.0012 + n.phase) * 0.5 + 0.5) * n.tw;
        ctx.fillStyle = `rgba(255, 225, 160, ${0.25 + twinkle * 0.35})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.4 * dpr + twinkle * 0.9 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 -z-10 opacity-80"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/* -------------------------------------------------------
   3) TypewriterHeadline: rotates key phrases w/ caret
------------------------------------------------------- */
function TypewriterHeadline() {
  const phrases = useMemo(
    () => [
      'The DAO Party of the Powerless',
      'Service, Not Career. Community, Not Power.',
      'Many Rivers, One Flow.',
      'Make Thrones Irrelevant.',
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

  useEffect(() => {
    let t: any;
    const current = phrases[idx];

    if (phase === 'typing') {
      if (text.length < current.length) {
        t = setTimeout(() => setText(current.slice(0, text.length + 1)), 30);
      } else {
        setPhase('pausing');
        t = setTimeout(() => setPhase('deleting'), 1300);
      }
    } else if (phase === 'deleting') {
      if (text.length > 0) {
        t = setTimeout(() => setText(current.slice(0, text.length - 1)), 16);
      } else {
        setIdx((i) => (i + 1) % phrases.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx, phrases]);

  return (
    <h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3">
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">
        {text}
      </span>
      <span className="inline-block w-[10px] bg-amber-300 ml-[2px] caret" />
      <style jsx>{`
        .caret { animation: blink 1s step-end infinite; height: 1em; transform: translateY(2px); }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </h1>
  );
}

/* -------------------------------------------------------
   4) LivingCTA: breathing orb + ripple ring + magnetic parallax
------------------------------------------------------- */
function LivingCTA(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const x = (e.clientX / w - 0.5) * 16; // ±8px
      const y = (e.clientY / h - 0.5) * 16; // ±8px
      setMx(x); setMy(y);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <a
      {...props}
      className={`relative inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold overflow-hidden group`}
      style={{ transform: `translate3d(${mx}px, ${my}px, 0)` }}
    >
      <span className="relative z-10">Join Us to Restore the Flow</span>
      <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="absolute inset-0 rounded-2xl blur-xl bg-amber-300/70 animate-breathe" />
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-hover:ring-8 group-hover:ring-amber-300/35 transition-[ring-width] duration-500" />
      <style jsx global>{`
        @keyframes breathe {
          0% { transform: scale(1); opacity: .7; }
          50% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: .7; }
        }
        .animate-breathe { animation: breathe 2.2s ease-in-out infinite; }
      `}</style>
    </a>
  );
}

/* -------------------------------------------------------
   5) Slow Marquee: names flow like a river (CSS only)
------------------------------------------------------- */
function NamesMarquee() {
  const items = [
    'Mane Kharka', 'Gaire Kharka', 'Bhaktapur', 'Panga', 'Thimi',
    'Patlekhet', 'Lalitpur', 'Kirtipur', 'Khokana', 'Sankhu',
    'Bungamati', 'Siddhipur', 'Sunakothi', 'Bode', 'Harisiddhi',
  ];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="whitespace-nowrap animate-marquee py-2 text-[12px] sm:text-sm">
        {items.concat(items).map((n, i) => (
          <span key={i} className="mx-4 text-amber-200/90">{n} •</span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 22s linear infinite; }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------
   Decorative starfield (pure CSS) to add depth
------------------------------------------------------- */
function Starfield() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s"></div>
        <div className="layer layer-m"></div>
        <div className="layer layer-l"></div>
      </div>
      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 60s linear infinite; opacity: 0.75; }
        .layer-s {
          background-image: radial-gradient(white 1px, transparent 1.5px), radial-gradient(white 1px, transparent 1.5px);
          background-size: 120px 120px, 160px 160px; background-position: 0 0, 60px 80px;
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.35)); animation-duration: 90s;
        }
        .layer-m {
          background-image: radial-gradient(white 1.5px, transparent 2px), radial-gradient(white 1.5px, transparent 2px);
          background-size: 200px 200px, 260px 260px; background-position: 40px 20px, 160px 100px;
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.25)); animation-duration: 120s;
        }
        .layer-l {
          background-image: radial-gradient(white 2px, transparent 2.5px), radial-gradient(white 2px, transparent 2.5px);
          background-size: 320px 320px, 420px 420px; background-position: 120px 60px, 260px 180px;
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.2)); animation-duration: 150s;
        }
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-2%, -3%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------
   Main Page
------------------------------------------------------- */
function DaoWord({ className = "" }: { className?: string }) {
  return (
    <a href="/faq#dao" className={`underline decoration-dotted underline-offset-2 ${className}`}>DAO</a>
  );
}

export default function HomePage() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  const NavLinks = useMemo(
    () => () => (
      <>
        <a className="hover:text-white" href="/why">Why</a>
        <a className="hover:text-white" href="/how">How</a>
        <a className="hover:text-white" href="/what">What</a>
        <a className="hover:text-white" href="#manifesto">Manifesto</a>
        <a className="hover:text-white" href="/polls">Polls</a>
        <a className="hover:text-white" href="/proposals">Proposals</a>
        <a className="hover:text-white" href="/members">Members</a>
        <a className="hover:text-white" href="/blog">Blog</a>
        <a className="hover:text-white" href="/faq#dao">FAQ</a>
      </>
    ), []);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Entry ritual + moving layers */}
      <EntryPortal />
      <ClientOnly>{mounted ? <MandalaCanvas /> : null}</ClientOnly>
      <Starfield />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-4 sm:pt-6 relative z-20">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-8 sm:h-9 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="leading-tight">
              <p className="text-[16px] sm:text-sm font-bold tracking-wide text-white">Gatishil Nepal</p>
              <p className="text-[11px] sm:text-[12px] text-slate-200/85"><DaoWord /> · Guthi · Movement</p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <NavLinks />
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <motion.a href="/join" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              Join
            </motion.a>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <a href="/login" className="px-3 py-1.5 border border-white/10 rounded-lg text-[11px] hover:bg-white/5 transition">Login</a>
            <a href="/join" className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-[11px]">Join</a>
          </div>

          {/* Hamburger */}
          <button
            type="button" aria-label="Open menu" aria-controls="mobile-menu"
            aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(v => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 border border-white/10 hover:bg-white/5"
          >
            {!open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <motion.div id="mobile-menu" initial={false} animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }} className="md:hidden overflow-hidden">
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-sm text-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <NavLinks />
            </div>
          </div>
        </motion.div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-10 sm:pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          {/* Left text */}
          <div className="lg:col-span-7">
            <motion.span className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full bg-black/20" {...fadeUp(0)}>
              GatishilNepal.org
            </motion.span>

            <TypewriterHeadline />

            <motion.p className="mt-4 text-slate-200/90 text-xl sm:text-2xl font-bold max-w-2xl" {...fadeUp(0.1)}>
              Service, Not Career. Community, Not Power.
            </motion.p>

            <motion.p className="mt-2 text-slate-200/90 text-sm sm:text-base max-w-2xl" {...fadeUp(0.14)}>
              Not another party of faces, but a movement that makes thrones irrelevant.
              Live free without fear. Create together. Restore the flow. Rise as one.
            </motion.p>

            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <LivingCTA href="/join" />
              <motion.a
                href="#manifesto"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
                {...fadeUp(0.22)}
              >
                Read Our Manifesto
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-300 mt-3" {...fadeUp(0.24)}>
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>

            <div className="mt-6 max-w-xl"><NamesMarquee /></div>
          </div>

          {/* Right: Daily Pulse */}
          <motion.aside className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]" {...fadeUp(0.18)}>
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-200/85 mt-1">Gatishil moves every day — small decisions, big rhythm.</p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <motion.div className="grid grid-cols-2 gap-3" {...fadeUp(0.22)}>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-200/85 text-[11px]">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-200/85 text-[11px]">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Review →</a>
                </div>
              </motion.div>

              <motion.div className="p-3 rounded-xl bg-white/5 border border-white/10" {...fadeUp(0.26)}>
                <p className="text-[11px] text-slate-200/85">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </motion.div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div id="manifesto" className="text-center max-w-3xl mx-auto mb-8 px-2">
            <p className="uppercase tracking-widest text-[10px] text-amber-300/85">Manifesto</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">The Power of the Powerless</h2>
            <p className="text-sm sm:text-base text-slate-300/85 mt-3">Eight vows to give Nepal back to its people.</p>
          </div>

          <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['🔥 Courage — Awaken the Giant', [
                'Stop accepting helplessness. Our strength is immense but sleeping.',
                '• The elephant forgets its power when it believes the rope is unbreakable.',
                '• The mightiest river begins as a forgotten spring.',
                '• The system sells fear; we return to the flow.',
              ]],
              ['🌱 Livelihood — Root Our Economy', [
                'True prosperity is self-reliance, not borrowed survival.',
                '• You cannot build a house on borrowed bricks.',
                '• Eat from your own harvest; no one can buy your hunger.',
                '• Work is dignity; dependence is chains.',
              ]],
              ['⚖️ Justice — Truth Has No Master', [
                'The law must be blind, especially to the powerful.',
                '• If the fence eats the crops, who protects the field?',
                '• The scale must be balanced, not for sale.',
                '• Fairness is not charity; it is our birthright.',
              ]],
              ['🌍 Transparency — Light Belongs to All', [
                'Every rupee should shine, every decision be seen.',
                '• Darkness hides thieves; light protects the people.',
                '• Muddy water hides fish; clear water builds trust.',
                '• The sun never left, we just closed our eyes',
              ]],
              ['🤝 Solidarity — Bundle the Sticks', [
                'Our unity is our only undeniable strength.',
                '• One stick breaks; a bundle does not.',
                '• One drum sounds hollow; many drums shake the earth.',
                '• Alone we are prey; together we are thunder.',
              ]],
              ['🛠 Servitude — Eat After the People', [
                'Leadership is service, not reward. Politics is duty, not business.',
                '• The true shepherd eats after the flock, not from it.',
                '• Power is not ownership; it is responsibility.',
                '• To serve is to see the divine in every citizen.',
              ]],
              ['🎶 Culture — Every Voice Sings', [
                'Many Rivers, One Flow — The United Soul of Nepal.',
                '• Crafted by many, mastered by none.',
                '• We are not a solo; we are a chorus.',
                '• Diversity is our strength — many notes, one harmony.',
              ]],
              ['❤️ Freedom — Remember the Sky', [
                'Freedom is our natural state; we’ve just forgotten its taste.',
                '• The throne survives only if we keep bowing.',
                '• A bird in a cage forgets the sky until it flies.',
                '• Freedom is not a privilege; it is the air we breathe.',
              ]],
            ].map(([title, lines], i) => (
              <motion.div key={String(i)} {...fadeUp(0.02 + i * 0.02)} className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="font-semibold text-base sm:text-lg">{title as string}</h3>
                <ul className="mt-2 space-y-2 text-slate-200/85 text-sm">
                  {(lines as string[]).map((line, j) => (<li key={j}>{line}</li>))}
                </ul>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-center text-[16px] text-slate-300">
            Keep your vows in your heart, but navigate the world with your eyes wide open to its realities.
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
