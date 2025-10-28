'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Gatishil Nepal — Living Story (No dependencies)
 * Story beats:
 * 0–2s   : SEED (golden pulse at center)
 * 2–6s   : MANDALA (rings + spokes rotate; stars twinkle)
 * 6–10s  : MORPH (mandala smoothly becomes Nepal silhouette)
 * 10s →  : NEPAL MAP (alive with twinkles) + INVITATION ORB (pulsing)
 *
 * All animation is procedural on a single <canvas>.
 * No images, no audio, no external libraries. Lightweight & rural-friendly.
 */

type V2 = [number, number];

function normalizePath(path: V2[], scale = 1.0): V2[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of path) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
  const w = maxX - minX, h = maxY - minY, s = scale / Math.max(w, h || 1);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return path.map(([x, y]) => [(x - cx) * s, (y - cy) * s]);
}

/** Very-light Nepal outline (cartoonish). Tuned for silhouette recognition. */
const NEPAL_RAW: V2[] = [
  [-83.8,29.7],[-83.0,30.0],[-82.2,30.3],[-81.2,30.2],[-80.3,29.9],[-79.7,29.5],[-79.0,29.2],
  [-78.2,29.0],[-77.4,28.8],[-76.6,28.6],[-76.0,28.4],[-75.0,28.3],[-74.0,28.0],[-73.0,27.8],
  [-72.0,27.6],[-71.0,27.5],[-70.2,27.5],[-69.4,27.6],[-68.8,27.8],[-68.0,27.9],[-67.0,28.0],
  [-66.0,28.0],[-65.0,27.9],[-64.0,27.7],[-63.0,27.6],[-62.0,27.5],[-61.0,27.4],[-60.0,27.3],
  [-59.0,27.2],[-58.0,27.1],[-57.0,27.0],[-56.0,26.9],[-55.0,26.8],[-54.2,26.8],[-53.3,26.9],
  [-52.5,27.1],[-51.6,27.3],[-50.8,27.6],[-50.0,27.8],[-49.0,28.0],[-48.0,28.2],[-47.0,28.4],
  [-46.0,28.5],[-45.0,28.7],[-44.0,28.8],[-43.0,28.9],[-42.0,29.0],[-41.0,29.1],[-40.0,29.2],
  [-39.0,29.3],[-38.0,29.4],[-37.0,29.5],[-36.0,29.6],[-35.0,29.7],
];
const NEPAL = normalizePath(NEPAL_RAW, 2.6);

/** Helpers */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }

function resamplePolyline(path: V2[], count: number): V2[] {
  // get cumulative arc length
  const pts = path;
  let L = 0;
  const segs: { a: V2; b: V2; d: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, d }); L += d;
  }
  const out: V2[] = [];
  for (let k = 0; k < count; k++) {
    const t = (k / Math.max(1, count - 1)) * L;
    let acc = 0;
    for (const { a, b, d } of segs) {
      if (acc + d >= t) {
        const u = d ? (t - acc) / d : 0;
        out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
        break;
      }
      acc += d;
    }
  }
  return out;
}

function makeMandala(count: number, rings = 6, radius = 1.25): V2[] {
  const pts: V2[] = [];
  const perRing = Math.max(12, Math.floor(count / rings));
  for (let r = 1; r <= rings; r++) {
    const rad = (radius * r) / rings;
    for (let i = 0; i < perRing; i++) {
      const a = (i / perRing) * Math.PI * 2;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
  }
  // pad or trim
  while (pts.length < count) pts.push(pts[pts.length % (perRing * rings)]);
  if (pts.length > count) pts.length = count;
  return pts;
}

/** Main canvas story */
function StoryCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * DPR);
      canvas.height = Math.floor(clientHeight * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // DATA
    const COUNT = 1400; // points
    const stars: { x: number; y: number; s: number; p: number }[] = [];
    const twinkle: number[] = [];
    const pos: Float32Array = new Float32Array(COUNT * 2);     // current xy
    const target: Float32Array = new Float32Array(COUNT * 2);  // target xy

    // init stars
    function resetStars() {
      stars.length = 0;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      for (let i = 0; i < 220; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          s: Math.random() * 1.2 + 0.2,
          p: Math.random() * Math.PI * 2,
        });
      }
    }
    resetStars();

    // initial points at center
    for (let i = 0; i < COUNT; i++) {
      pos[i * 2] = 0; pos[i * 2 + 1] = 0;
      twinkle[i] = Math.random();
    }

    // mandala + map targets (unit coords → pixels via scale later)
    const mandala = makeMandala(COUNT, 7, 1.35);
    const map = resamplePolyline(NEPAL, COUNT);

    // phases
    type Phase = 'seed' | 'mandala' | 'morph' | 'map' | 'invite';
    let phase: Phase = 'seed';
    const t0 = performance.now();

    function phaseAt(tms: number): Phase {
      const t = (tms - t0) / 1000;
      if (t < 2) return 'seed';
      if (t < 6) return 'mandala';
      if (t < 10) return 'morph';
      if (t < 12) return 'map';
      return 'invite';
    }

    function setTargets(ph: Phase) {
      for (let i = 0; i < COUNT; i++) {
        let x = 0, y = 0;
        if (ph === 'seed') { x = 0; y = 0; }
        if (ph === 'mandala') { x = mandala[i][0]; y = mandala[i][1]; }
        if (ph === 'morph') { x = (mandala[i][0] * 0.5 + map[i][0] * 0.5); y = (mandala[i][1] * 0.5 + map[i][1] * 0.5); }
        if (ph === 'map' || ph === 'invite') { x = map[i][0]; y = map[i][1]; }
        target[i * 2] = x; target[i * 2 + 1] = y;
      }
    }

    setTargets('seed');

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      const ph = phaseAt(now);
      if (ph !== phase) { phase = ph; setTargets(phase); }

      const W = canvas.clientWidth, H = canvas.clientHeight;
      const cx = W / 2, cy = H / 2;
      const scale = Math.min(W, H) * 0.36;

      // background (deep)
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // distant starfield
      for (const st of stars) {
        const tw = (Math.sin(now * 0.001 + st.p) * 0.5 + 0.5) * 0.6 + 0.2;
        ctx.fillStyle = `rgba(255,255,255,${0.14 + tw * 0.18})`;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }

      ctx.save();
      ctx.translate(cx, cy);

      // subtle rotation for mandala/morph
      if (phase === 'mandala') ctx.rotate((now - t0) * 0.00015 * Math.PI * 2);
      if (phase === 'morph') ctx.rotate((now - t0) * 0.00007 * Math.PI * 2);

      // target easing
      const ease = phase === 'seed' ? 0.12 : phase === 'mandala' ? 0.18 : phase === 'morph' ? 0.14 : 0.1;

      // draw guide lines (mandala ring / nepal outline)
      if (phase === 'mandala' || phase === 'morph') {
        ctx.strokeStyle = 'rgba(251,191,36,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const R = scale * 1.1;
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (phase === 'morph' || phase === 'map' || phase === 'invite') {
        ctx.strokeStyle = phase === 'morph' ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.75)';
        ctx.lineWidth = phase === 'invite' ? 2 : 1.5;
        ctx.beginPath();
        for (let i = 0; i < NEPAL.length; i++) {
          const [x, y] = NEPAL[i];
          const px = x * scale, py = y * scale;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // animate points toward target & draw twinkling nodes
      for (let i = 0; i < COUNT; i++) {
        const tx = target[i * 2] * scale;
        const ty = target[i * 2 + 1] * scale;
        pos[i * 2] = lerp(pos[i * 2], tx, ease);
        pos[i * 2 + 1] = lerp(pos[i * 2 + 1], ty, ease);

        const tw = (Math.sin(now * 0.0012 + twinkle[i] * 6.28) * 0.5 + 0.5);
        const a = 0.22 + tw * 0.35;
        ctx.fillStyle = `rgba(252,211,77,${a})`; // amber-300
        const r = 1 + tw * 1.8;
        ctx.beginPath();
        ctx.arc(pos[i * 2], pos[i * 2 + 1], r, 0, Math.PI * 2);
        ctx.fill();
      }

      // invitation orb
      if (phase === 'invite') {
        const pulse = (Math.sin(now * 0.003) * 0.5 + 0.5);
        ctx.fillStyle = `rgba(253,230,138,${0.6 + pulse * 0.35})`; // amber-200
        ctx.beginPath();
        ctx.arc(0, 0, 22 + pulse * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(253,230,138,${0.28 + pulse * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 44 + pulse * 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // soft top gradient
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, 'rgba(251,191,36,0.10)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    raf = requestAnimationFrame(draw);

    // handle visibility + resize stars density
    function onVisibility() {
      if (document.hidden) return;
      resetStars();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 -z-10 block w-full h-full"
      style={{ background: '#000' }}
    />
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* LIVE STORY CANVAS */}
      <StoryCanvas />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-4 sm:pt-6">
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
              <p className="text-[11px] sm:text-[12px] text-slate-200/85">DAO · Guthi · Movement</p>
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
            <a href="/join" className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:translate-y-[-2px]">
              Join
            </a>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            <a
              href="/login"
              className="px-3 py-1.5 border border-white/10 rounded-lg text-[11px] hover:bg-white/5 transition"
            >
              Login
            </a>
            <a
              href="/join"
              className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-[11px]"
            >
              Join
            </a>
            <button
              type="button"
              aria-label="Open menu"
              aria-controls="mobile-menu"
              aria-expanded={menuOpen ? 'true' : 'false'}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg p-2 border border-white/10 hover:bg-white/5"
            >
              {!menuOpen ? (
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
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${menuOpen ? 'opacity-100 max-h-64' : 'opacity-0 max-h-0'}`}
        >
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
        </div>
      </header>

      {/* HERO COPY */}
      <section id="story" className="relative z-10 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <span className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full bg-black/20">
              GatishilNepal.org
            </span>

            <h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3">
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO</span> Party of the Powerless.
            </h1>

            <p className="mt-4 text-slate-200/90 text-xl sm:text-2xl font-bold max-w-2xl">
              Seed → Mandala → Nepal. Not a poster — a remembrance.
            </p>

            <p className="mt-2 text-slate-200/90 text-sm sm:text-base max-w-2xl">
              We don’t replace faces. We make thrones irrelevant. Live free without fear. Create together. Restore the flow. Rise as one.
            </p>

            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <a
                href="/join"
                className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition hover:translate-y-[-2px] shadow-[0_0_40px_rgba(251,191,36,0.35)]"
              >
                Sit under the Tree
              </a>
              <a
                href="#manifesto"
                className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center"
              >
                Read Our Manifesto
              </a>
            </div>

            <p className="text-[11px] text-slate-300 mt-3">
              By joining you agree to transparent, tamper-proof decisions.
            </p>
          </div>

          {/* Right rail */}
          <aside className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]">
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-200/85 mt-1">Gatishil moves every day — small decisions, big rhythm.</p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-slate-200/85">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Manifesto header (keep your existing manifesto cards below if you have them) */}
      <section id="manifesto" className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-8 px-2">
            <p className="uppercase tracking-widest text-[10px] text-amber-300/85">Manifesto</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">The Power of the Powerless</h2>
            <p className="text-sm sm:text-base text-slate-300/85 mt-3">Eight vows to give Nepal back to its people.</p>
          </div>
          {/* Keep the rest of your manifesto cards/content here */}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {new Date().getFullYear()} GatishilNepal.org</p>
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
