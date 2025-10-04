"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * AwakenedSky v6.3
 * - Global <style> tag (NOT styled-jsx) so keyframes apply inside portal.
 * - Ultra-high z-index; planets guaranteed visible.
 */
const PLANETS = [
  { src: "/planet/earth.png",   size: 180, cls: "p-left-up"   },
  { src: "/planet/moon.png",    size: 120, cls: "p-right-up"  },
  { src: "/planet/mars.png",    size: 160, cls: "p-left-down" },
  { src: "/planet/saturn.png",  size: 220, cls: "p-right-down"},
  { src: "/planet/jupiter.png", size: 240, cls: "p-up"        },
];

function Img({ src, size, className }) {
  return (
    <img
      src={src}
      alt="planet"
      className={className}
      style={{ position: "absolute", width: size, height: size, objectFit: "contain" }}
      onError={(e) => {
        const el = e.currentTarget;
        el.removeAttribute("src");
        el.style.background = "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), rgba(200,200,255,0.2) 60%, transparent 70%)";
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
    <div style={{ position: "fixed", inset: 0, width: "100dvw", height: "100dvh", color: "white", overflow: "hidden", zIndex: 99999 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          {PLANETS.map((p, i) => <Img key={i} src={p.src} size={p.size} className={`planet ${p.cls}`} />)}
        </div>
      </div>

      {/* Headline */}
      <div style={{ position: "absolute", insetInline: 0, top: "12vh", textAlign: "center", paddingInline: "1rem", zIndex: 5 }}>
        <div style={{ fontSize: "clamp(22px,4vw,44px)", fontWeight: 600, textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div style={{ opacity: 0.8, marginTop: 8 }}>Walk it. Share it. Build with it.</div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", insetInline: 0, bottom: "10vh", textAlign: "center", paddingInline: "1rem", zIndex: 5 }}>
        <div style={{ opacity: 0.85, marginBottom: 12 }}>Breathe… your direction is clear.</div>
        <button
          style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(16,185,129,0.9)", color: "#000", fontWeight: 700, boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
        >Continue</button>
      </div>

      {/* GLOBAL styles for portal elements */}
      <style>{`
        .planet { opacity: 1; transform-origin: center; animation-duration: 36s; animation-iteration-count: infinite; animation-timing-function: linear; }
        @media (prefers-reduced-motion: reduce) { .planet { animation: none !important; } }
        .p-left-up    { animation-name: driftLeftUp; }
        .p-right-up   { animation-name: driftRightUp; }
        .p-left-down  { animation-name: driftLeftDown; }
        .p-right-down { animation-name: driftRightDown; }
        .p-up         { animation-name: driftUp; }
        @keyframes driftLeftUp    { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate(-50vw,-14vh) scale(1.06)} 100%{transform:translate(-110vw,-20vh) scale(.98)} }
        @keyframes driftRightUp   { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate( 36vw,-12vh) scale(1.05)} 100%{transform:translate( 110vw,-18vh) scale(1.00)} }
        @keyframes driftLeftDown  { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate(-32vw, 18vh) scale(1.04)} 100%{transform:translate(-110vw, 60vh) scale(.99)} }
        @keyframes driftRightDown { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate( 30vw, 20vh) scale(1.04)} 100%{transform:translate( 110vw, 60vh) scale(1.00)} }
        @keyframes driftUp        { 0%{transform:translate(0,0) scale(.9)} 50%{transform:translate( 4vw, -26vh) scale(1.07)} 100%{transform:translate( 6vw, -110vh) scale(1.02)} }
      `}</style>
    </div>,
    document.body
  );
}
