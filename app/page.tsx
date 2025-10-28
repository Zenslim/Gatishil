'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

/** -----------------------------------------------------------
 * Install (package.json):
 *   "three": "^0.160.0",
 *   "@react-three/fiber": "^8.15.16",
 *   "@react-three/drei": "^9.97.0"
 * ----------------------------------------------------------*/

// Lazy-load the heavy bit so LCP stays snappy.
const R3FCanvas = dynamic(
  () => import('@react-three/fiber').then((m) => m.Canvas as any),
  { ssr: false }
);
const Drei = {
  OrbitControls: dynamic(() => import('@react-three/drei').then(m => m.OrbitControls), { ssr: false }),
  Line: dynamic(() => import('@react-three/drei').then(m => m.Line), { ssr: false }),
  Points: dynamic(() => import('@react-three/drei').then(m => m.Points), { ssr: false }),
  PointMaterial: dynamic(() => import('@react-three/drei').then(m => m.PointMaterial), { ssr: false }),
};

/** —— Utilities —— */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay } },
  viewport: { once: true, amount: 0.35 },
});

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** —— Optional wordless audio (no deps) —— */
function FlowModeToggle() {
  const [on, setOn] = useState(false);
  const audioRef = useRef<{
    ctx?: AudioContext, master?: GainNode,
    humOsc?: OscillatorNode, humGain?: GainNode,
    wind?: AudioBufferSourceNode, windGain?: GainNode
  } | null>(null);

  async function start() {
    if (on) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);

      // HUM ~110Hz + slow amp LFO
      const humOsc = ctx.createOscillator(); humOsc.type = 'sine'; humOsc.frequency.value = 110;
      const humGain = ctx.createGain(); humGain.gain.value = 0.0;
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.05;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(humGain.gain);
      humOsc.connect(humGain).connect(master); humOsc.start(); lfo.start();

      // WIND (brown noise)
      const windGain = ctx.createGain(); windGain.gain.value = 0.0; windGain.connect(master);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { const w = Math.random()*2-1; last = (last + 0.02*w)/1.02; data[i] = last*0.4; }
      const wind = ctx.createBufferSource(); wind.buffer = buffer; wind.loop = true; wind.connect(windGain); wind.start();

      const now = ctx.currentTime;
      master.gain.linearRampToValueAtTime(1.0, now + 0.4);
      humGain.gain.linearRampToValueAtTime(0.22, now + 4.0);
      windGain.gain.linearRampToValueAtTime(0.14, now + 4.5);

      audioRef.current = { ctx, master, humOsc, humGain, wind, windGain };
      setOn(true);
    } catch {}
  }
  function stop() {
    if (!on || !audioRef.current) return;
    const { ctx, master, humGain, windGain } = audioRef.current;
    const now = ctx!.currentTime;
    humGain!.gain.linearRampToValueAtTime(0, now + 0.8);
    windGain!.gain.linearRampToValueAtTime(0, now + 0.8);
    master!.gain.linearRampToValueAtTime(0, now + 0.9);
    setTimeout(() => { try { ctx!.close(); } catch {} audioRef.current = null; }, 950);
    setOn(false);
  }

  return (
    <button
      type="button"
      onClick={() => (on ? stop() : start())}
      aria-pressed={on}
      className={`fixed right-3 top-3 z-40 px-3 py-1.5 rounded-full text-[11px] border transition
        ${on ? 'bg-amber-400 text-black border-transparent' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'}`}
    >
      {on ? 'Flow Mode: ON' : 'Flow Mode: OFF'}
    </button>
  );
}

/** —— Story Geometry —— 
 * We’ll morph from a radial mandala to a simplified outline of Nepal.
 * The outline is a hand-tuned polyline normalized to ~unit space.
 */
type V2 = [number, number];
function normalizePath(path: V2[], scale = 1.0): V2[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  path.forEach(([x,y]) => { minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y); });
  const w = maxX - minX, h = maxY - minY, s = scale / Math.max(w, h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return path.map(([x,y]) => [ (x - cx) * s, (y - cy) * s ]);
}

// Rough Nepal silhouette (very simplified), clockwise
const NEPAL_PATH_RAW: V2[] = [
  // West → East rough outline points (cartoon-ish; tweak as needed)
  [-83.8,29.7],[-83.0,30.0],[-82.2,30.3],[-81.2,30.2],[-80.3,29.9],[-79.7,29.5],
  [-79.0,29.2],[-78.2,29.0],[-77.4,28.8],[-76.6,28.6],[-76.0,28.4],[-75.0,28.3],
  [-74.0,28.0],[-73.0,27.8],[-72.0,27.6],[-71.0,27.5],[-70.2,27.5],[-69.4,27.6],
  [-68.8,27.8],[-68.0,27.9],[-67.0,28.0],[-66.0,28.0],[-65.0,27.9],[-64.0,27.7],
  [-63.0,27.6],[-62.0,27.5],[-61.0,27.4],[-60.0,27.3],[-59.0,27.2],[-58.0,27.1],
  [-57.0,27.0],[-56.0,26.9],[-55.0,26.8],[-54.2,26.8],[-53.3,26.9],[-52.5,27.1],
  [-51.6,27.3],[-50.8,27.6],[-50.0,27.8],[-49.0,28.0],[-48.0,28.2],[-47.0,28.4],
  [-46.0,28.5],[-45.0,28.7],[-44.0,28.8],[-43.0,28.9],[-42.0,29.0],[-41.0,29.1],
  [-40.0,29.2],[-39.0,29.3],[-38.0,29.4],[-37.0,29.5],[-36.0,29.6],[-35.0,29.7],
];
const NEPAL_PATH = normalizePath(NEPAL_PATH_RAW, 2.6); // scale ~2.6 units wide

/** Create radial mandala positions (rings × spokes) */
function makeMandalaPositions(rings = 6, spokes = 120, radius = 1.3) {
  const pts: V2[] = [];
  for (let i = 1; i <= rings; i++) {
    const r = (radius * i) / rings;
    for (let s = 0; s < spokes; s++) {
      const a = (s / spokes) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return pts;
}

/** Resample a path to N points */
function resamplePath(path: V2[], count: number): V2[] {
  // linear segments cumlen
  const segs: { p: V2; d: number }[] = [];
  let L = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i], b = path[(i+1)%path.length];
    const dx = b[0]-a[0], dy = b[1]-a[1];
    const d = Math.hypot(dx, dy); segs.push({ p: a, d }); L += d;
  }
  const out: V2[] = [];
  for (let k = 0; k < count; k++) {
    const t = (k / count) * L;
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      const { p: a, d } = segs[i];
      const b = path[(i+1)%path.length];
      if (acc + d >= t) {
        const u = (t - acc) / d || 0;
        out.push([a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u]);
        break;
      }
      acc += d;
    }
  }
  return out;
}

/** —— Story Machine —— */
type Phase = 'seed' | 'mandala' | 'morph' | 'map' | 'invite';

function useStoryPhases() {
  const [phase, setPhase] = useState<Phase>('seed');
  useEffect(() => {
    let t1 = setTimeout(() => setPhase('mandala'), 1500);
    let t2 = setTimeout(() => setPhase('morph'), 4500);
    let t3 = setTimeout(() => setPhase('map'), 6500);
    let t4 = setTimeout(() => setPhase('invite'), 9000);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, []);
  return phase;
}

/** —— R3F Scene —— */
function StoryScene() {
  const phase = useStoryPhases();
  const group = useRef<any>(null);

  // Points budget
  const COUNT = 1200;
  const mandala = useMemo(() => makeMandalaPositions(6, Math.ceil(COUNT/6), 1.25), []);
  const nepalResampled = useMemo(() => resamplePath(NEPAL_PATH, COUNT), []);

  // buffer arrays
  const pos = useMemo(() => new Float32Array(COUNT * 3), [COUNT]);
  const target = useMemo(() => new Float32Array(COUNT * 3), [COUNT]);
  const twinkle = useMemo(() => new Float32Array(COUNT), [COUNT]);

  // init positions (start collapsed at center)
  useEffect(() => {
    for (let i = 0; i < COUNT; i++) {
      pos[i*3+0] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
      twinkle[i] = Math.random();
    }
  }, [COUNT, pos, twinkle]);

  // set targets per phase
  useEffect(() => {
    for (let i = 0; i < COUNT; i++) {
      const [mx, my] = mandala[i % mandala.length];
      const [nx, ny] = nepalResampled[i % nepalResampled.length];
      let tx = 0, ty = 0;
      if (phase === 'seed') { tx = 0; ty = 0; }
      else if (phase === 'mandala') { tx = mx; ty = my; }
      else if (phase === 'morph') { // halfway in-between
        tx = mx * 0.5 + nx * 0.5; ty = my * 0.5 + ny * 0.5;
      } else if (phase === 'map' || phase === 'invite') { tx = nx; ty = ny; }
      target[i*3+0] = tx;
      target[i*3+1] = ty;
      target[i*3+2] = 0;
    }
  }, [phase, COUNT, target, mandala, nepalResampled]);

  // animate towards target + rotate
  // We keep imports inline to avoid tree-shaking issues in this single file.
  const { useFrame } = require('@react-three/fiber') as typeof import('@react-three/fiber');
  useFrame((state, delta) => {
    const speed = Math.min(8*delta, 0.18);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3+0] = pos[i*3+0] + (target[i*3+0] - pos[i*3+0]) * speed;
      pos[i*3+1] = pos[i*3+1] + (target[i*3+1] - pos[i*3+1]) * speed;
      // tiny z shimmer
      const zJitter = (Math.sin((state.clock.elapsedTime + twinkle[i]) * 0.8) * 0.02);
      pos[i*3+2] = zJitter;
    }
    if (group.current) {
      const rotSpeed = phase === 'mandala' ? 0.08 : phase === 'morph' ? 0.04 : 0.01;
      group.current.rotation.z += rotSpeed * delta;
    }
  });

  // lines for mandala + map (simple ring + outline)
  const lines = useMemo(() => {
    const ring: V2[] = [];
    const S = 160;
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2;
      ring.push([Math.cos(a)*1.25, Math.sin(a)*1.25]);
    }
    return {
      ring,
      outline: NEPAL_PATH,
    };
  }, []);

  return (
    <group ref={group}>
      {/* Points */}
      <Drei.Points positions={pos} stride={3}>
        <Drei.PointMaterial transparent color="#FCD34D" size={0.03} sizeAttenuation depthWrite={false} />
      </Drei.Points>

      {/* Mandala ring (fades out as we morph) */}
      {(phase === 'mandala' || phase === 'morph') && (
        <Drei.Line
          points={lines.ring.map(([x,y]) => [x,y,0])}
          color="#FBBF24"
          lineWidth={1.2}
          dashed={false}
          transparent opacity={phase === 'morph' ? 0.35 : 0.6}
        />
      )}

      {/* Nepal outline (fades in on map) */}
      {(phase === 'morph' || phase === 'map' || phase === 'invite') && (
        <Drei.Line
          points={lines.outline.map(([x,y]) => [x,y,0])}
          color="#F59E0B"
          lineWidth={1.4}
          transparent opacity={phase === 'morph' ? 0.25 : 0.75}
        />
      )}

      {/* Invitation orb */}
      {(phase === 'invite') && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshBasicMaterial color="#FDE68A" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

/** —— Canvas Wrapper —— */
function HeroCanvas() {
  const mounted = useMounted();
  if (!mounted) return null;
  return (
    <div className="absolute inset-0 -z-10">
      <R3FCanvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.6} />
        {/* Subtle key light */}
        <directionalLight position={[2, 2, 3]} intensity={0.6} color="#ffd9a0" />
        {/* Story */}
        <React.Suspense fallback={null}>
          <StoryScene />
        </React.Suspense>
        {/* Controls are disabled; uncomment to debug */}
        {/* <Drei.OrbitControls enablePan={false} enableZoom={false} enableRotate={false} /> */}
      </R3FCanvas>
    </div>
  );
}

/** —— DaoWord (minimal) —— */
function DaoWord({ className = "" }: { className?: string }) {
  return (
    <a href="/faq#dao" className={`underline decoration-dotted underline-offset-2 ${className}`}>DAO</a>
  );
}

/** —— Page —— */
export default function Page() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <FlowModeToggle />
      <HeroCanvas />

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-4 sm:pt-6 relative z-10">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/gatishil-logo.png" alt="Gatishil Nepal" className="h-8 sm:h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="leading-tight">
              <p className="text-[16px] sm:text-sm font-bold tracking-wide text-white">Gatishil Nepal</p>
              <p className="text-[11px] sm:text-[12px] text-slate-200/85"><DaoWord /> · Guthi · Movement</p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <a className="hover:text-white" href="#story">Story</a>
            <a className="hover:text-white" href="#manifesto">Manifesto</a>
            <a className="hover:text-white" href="/polls">Polls</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/faq#dao">FAQ</a>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <motion.a href="/join" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              Join
            </motion.a>
          </div>

          {/* Mobile actions */}
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
              <a className="hover:text-white" href="#story">Story</a>
              <a className="hover:text-white" href="#manifesto">Manifesto</a>
              <a className="hover:text-white" href="/polls">Polls</a>
              <a className="hover:text-white" href="/proposals">Proposals</a>
              <a className="hover:text-white" href="/blog">Blog</a>
              <a className="hover:text-white" href="/faq#dao">FAQ</a>
            </div>
          </div>
        </motion.div>
      </header>

      {/* HERO COPY */}
      <section id="story" className="relative z-10 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <motion.span className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full bg-black/20" {...fadeUp(0)}>
              GatishilNepal.org
            </motion.span>

            <motion.h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3" {...fadeUp(0.05)}>
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO</span> Party of the Powerless.
            </motion.h1>

            <motion.p className="mt-4 text-slate-200/90 text-xl sm:text-2xl font-bold max-w-2xl" {...fadeUp(0.1)}>
              Service, Not Career. Community, Not Power.
            </motion.p>

            <motion.p className="mt-2 text-slate-200/90 text-sm sm:text-base max-w-2xl" {...fadeUp(0.14)}>
              Seed → Mandala → Nepal. Not a speech, a remembering. We don’t replace faces; we make thrones irrelevant.
            </motion.p>

            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <motion.a href="/join" whileHover={{ y: -2, boxShadow: '0 0 40px rgba(251,191,36,0.35)' }} whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition" {...fadeUp(0.18)}>
                Sit under the Tree
              </motion.a>
              <motion.a href="#manifesto" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center" {...fadeUp(0.22)}>
                Read Our Manifesto
              </motion.a>
            </div>

            <motion.p className="text-[11px] text-slate-300 mt-3" {...fadeUp(0.24)}>
              By joining you agree to transparent, tamper-proof decisions.
            </motion.p>
          </div>

          {/* Right rail (kept minimal) */}
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

      {/* Manifesto (unchanged from your content style, trimmed for brevity) */}
      <section id="manifesto" className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-8 px-2">
            <p className="uppercase tracking-widest text-[10px] text-amber-300/85">Manifesto</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">The Power of the Powerless</h2>
            <p className="text-sm sm:text-base text-slate-300/85 mt-3">Eight vows to give Nepal back to its people.</p>
          </div>
          {/* … keep your 8 vows cards section from previous version … */}
        </div>
      </section>

      {/* Footer */}
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
