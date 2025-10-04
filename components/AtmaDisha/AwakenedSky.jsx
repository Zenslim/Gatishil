"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * AwakenedSky v6.2
 * - Planets rendered with pure CSS keyframes (no framer-motion).
 * - Ultra-high z-index. Always visible even if motion is reduced.
 * - Each img has onError fallback to a soft radial.
 */

const PLANETS = [
  { src: "/planet/earth.png",   size: 180, cls: "p-left-up",  delay: "0s"   },
  { src: "/planet/moon.png",    size: 120, cls: "p-right-up", delay: "0.12s"},
  { src: "/planet/mars.png",    size: 160, cls: "p-left-down",delay: "0.2s" },
  { src: "/planet/saturn.png",  size: 220, cls: "p-right-down",delay:"0.28s"},
  { src: "/planet/jupiter.png", size: 240, cls: "p-up",       delay: "0.16s"},
];

function FallbackImg({ src, size, className }){
  return (
    <img
      src={src}
      alt="planet"
      className={className}
      style={{ width: size, height: size }}
      onError={(e) => {
        const el = e.currentTarget;
        el.removeAttribute("src");
        el.style.background = "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.9), rgba(200,200,255,0.15) 60%, transparent 70%)";
        el.style.borderRadius = "9999px";
      }}
      draggable={false}
    />
  );
}

export default function AwakenedSky({ onContinue }){
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 w-[100dvw] h-[100dvh] z-[99999] text-white overflow-hidden">
      {/* Headline */}
      <div className="absolute inset-x-0 top-[12vh] text-center px-4 z-[5]">
        <div className="text-2xl md:text-4xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div className="opacity-80 mt-2">Walk it. Share it. Build with it.</div>
      </div>

      {/* Planets layer */}
      <div className="absolute inset-0 z-[4]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {PLANETS.map((p, i) => (
            <FallbackImg key={i} src={p.src} size={p.size} className={`absolute object-contain select-none planet ${p.cls}`} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4 z-[5]">
        <div className="opacity-85 mb-4">Breathe… your direction is clear.</div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-lg"
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
        >
          Continue
        </button>
      </div>

      <style jsx>{`
        .planet { opacity: 1; transform-origin: center; animation-duration: 36s; animation-iteration-count: infinite; animation-timing-function: linear; }
        @media (prefers-reduced-motion: reduce) { .planet { animation: none; } }
        .p-left-up   { animation-name: driftLeftUp;    animation-delay: 0s; }
        .p-right-up  { animation-name: driftRightUp;   animation-delay: 0.12s; }
        .p-left-down { animation-name: driftLeftDown;  animation-delay: 0.20s; }
        .p-right-down{ animation-name: driftRightDown; animation-delay: 0.28s; }
        .p-up        { animation-name: driftUp;        animation-delay: 0.16s; }
        @keyframes driftLeftUp   { 0%{transform:translate(0,0) scale(.85)} 50%{transform:translate(-50vw,-14vh) scale(1.06)} 100%{transform:translate(-110vw,-20vh) scale(.98)} }
        @keyframes driftRightUp  { 0%{transform:translate(0,0) scale(.85)} 50%{transform:translate( 36vw,-12vh) scale(1.05)} 100%{transform:translate( 110vw,-18vh) scale(1.00)} }
        @keyframes driftLeftDown { 0%{transform:translate(0,0) scale(.85)} 50%{transform:translate(-32vw, 18vh) scale(1.04)} 100%{transform:translate(-110vw, 60vh) scale(.99)} }
        @keyframes driftRightDown{ 0%{transform:translate(0,0) scale(.85)} 50%{transform:translate( 30vw, 20vh) scale(1.04)} 100%{transform:translate( 110vw, 60vh) scale(1.00)} }
        @keyframes driftUp       { 0%{transform:translate(0,0) scale(.85)} 50%{transform:translate( 4vw, -26vh) scale(1.07)} 100%{transform:translate( 6vw, -110vh) scale(1.02)} }
      `}</style>
    </div>,
    document.body
  );
}
