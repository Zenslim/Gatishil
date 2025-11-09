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

  /** Inject CSS into the iframe to remove the internal blue/purple panel and shadows */
  const neutralizeIframeChrome = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const style = doc.createElement("style");
      style.setAttribute("data-injected-by", "gatishil-tax-calculator");
      style.textContent = `
        /* Make the calculator sit on transparent canvas to match Gatishil background */
        html, body { background: transparent !important; }

        /* Common wrappers that carry gradient/solid fills in the HTML */
        .app, .wrap, .wrapper, .container, .shell, .hero, .panel, .card, .surface, .paper {
          background: transparent !important;
          backdrop-filter: none !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* If the blue gradient is on a specific section */
        section, header, .header, .hero-gradient, .gradient {
          background: transparent !important;
          box-shadow: none !important;
        }

        /* Soften any remaining rounded clip that looks like a box edge */
        .rounded, .rounded-2xl, .rounded-xl { background: transparent !important; }

        /* Remove any default body margin that creates a 'box' inset */
        body { margin: 0 !important; padding: 16px 0 24px 0 !important; }

        /* If the calculator centers with a max-width card, let it breathe without a colored sheet */
        .max-w-screen, .max-w, .sheet {
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
        }
      `;
      doc.head.appendChild(style);
    } catch {
      // If cross-origin ever changes, we silently skip (but our /public/tools is same-origin).
    }
  };

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

      {/* Calculator (full viewport), now neutralized to remove the blue box */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
          <div className="relative w-full h-[82vh] md:h-[86vh] rounded-2xl overflow-hidden">
            {/* Soft glow edges */}
            <div className="pointer-events-none absolute -inset-1 rounded-2xl blur-2xl bg-gradient-to-r from-amber-500/10 via-white/0 to-rose-500/10" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />

            <iframe
              ref={iframeRef}
              onLoad={neutralizeIframeChrome}
              title="Nepal True Tax Mirror — Calculator"
              src="/tools/nepal-tax-mirror.html?embed=1"
              className="absolute inset-0 w-full h-full border-0"
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
