// app/tax/calculator/Chrome.tsx
'use client';

import { useEffect, useRef, useState } from "react";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Soft starfield (CSS only) to match homepage */
function Starfield() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s" />
        <div className="layer layer-m" />
        <div className="layer layer-l" />
      </div>
      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 90s linear infinite; opacity: 0.9; }
        .layer-s {
          background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size: 120px 120px, 160px 160px;
          background-position: 0 0, 60px 80px;
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.35));
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
    </div>
  );
}

export default function Chrome() {
  const mounted = useMounted();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(1200); // safe initial height

  /** Make iframe seamless: no inner scroll, parent auto-resizes to content */
  const attachAutoResize = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // 1) Neutralize inner scrolling + colored sheets
    const style = doc.createElement("style");
    style.setAttribute("data-injected-by", "gatishil-tax");
    style.textContent = `
      html, body { background: transparent !important; overflow: hidden !important; }
      body { margin: 0 !important; padding: 16px 0 24px 0 !important; }
      /* wipe colored wrappers/panels/shadows */
      .app, .wrap, .wrapper, .container, .shell, .hero, .panel, .card, .surface, .paper,
      section, header, .header, .hero-gradient, .gradient,
      .rounded, .rounded-2xl, .rounded-xl,
      .max-w-screen, .max-w, .sheet {
        background: transparent !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    `;
    doc.head.appendChild(style);

    // 2) Observe size changes and resize iframe height
    const el = doc.documentElement; // track full page height
    const calcHeight = () => {
      const h = Math.max(
        doc.body?.scrollHeight || 0,
        el?.scrollHeight || 0,
        doc.body?.offsetHeight || 0,
        el?.offsetHeight || 0
      );
      const clamped = Math.min(Math.max(h, 600), 6000);
      setHeight(clamped);
    };

    // Initial measurement
    calcHeight();

    // SAFE feature checks (no optional chaining after "new")
    const RO: any = (window as any).ResizeObserver;
    const ro = RO ? new RO(() => calcHeight()) : null;
    if (ro) {
      try { ro.observe(doc.body || el); } catch {}
      try { ro.observe(el); } catch {}
    }

    const mo = new MutationObserver(() => calcHeight());
    mo.observe(doc, { childList: true, subtree: true, attributes: true, characterData: true });

    const id = window.setInterval(calcHeight, 800);
    const onLoad = () => calcHeight();
    iframe.addEventListener("load", onLoad);

    return () => {
      try { ro && ro.disconnect(); } catch {}
      try { mo.disconnect(); } catch {}
      try { window.clearInterval(id); } catch {}
      try { iframe.removeEventListener("load", onLoad); } catch {}
    };
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const onLoad = () => { cleanup && cleanup(); cleanup = attachAutoResize() as any; };
    const el = iframeRef.current;
    if (el) {
      el.addEventListener("load", onLoad, { once: false });
      if (el.contentDocument?.readyState === "complete") onLoad();
    }
    return () => {
      el?.removeEventListener("load", onLoad);
      cleanup && cleanup();
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Gatishil gradients */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.85] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>
      {mounted && <Starfield />}

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight">True Tax Mirror</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white" href="/tax">Landing</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
          </nav>
        </div>
      </header>

      {/* Sub-hero strip */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 pt-6 pb-3 flex items-center justify-between gap-4">
          <p className="text-sm md:text-base text-slate-300/90">
            Stack the invisible with the visible and see your <span className="text-white font-semibold">true effective tax rate</span>.
          </p>
          <a
            href="/tax"
            className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 transition"
          >
            Why it matters
          </a>
        </div>
      </section>

      {/* Calculator (auto-height, single page scroll, no inner box) */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
          <div className="relative w-full rounded-2xl overflow-visible">
            {/* Soft glow edges */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl bg-gradient-to-r from-amber-500/10 via-white/0 to-rose-500/10" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            <iframe
              ref={iframeRef}
              title="Nepal True Tax Mirror — Calculator"
              src="/tools/nepal-tax-mirror.html?embed=1"
              className="w-full border-0"
              style={{ height: `${height}px` }}
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="mt-3 text-[12px] text-slate-400">
            No sign-in. Nothing stored by default. Assumptions are editable inside the tool.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} GatishilNepal.org</span>
          <a href="/tax" className="underline underline-offset-4 decoration-white/30 hover:decoration-white">
            Back to Landing
          </a>
        </div>
      </footer>
    </main>
  );
}
