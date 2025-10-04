"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * AwakenedSky v6.4 (bullet-proof)
 * - Planets are animated with plain JS (requestAnimationFrame).
 * - No Tailwind/scoped CSS dependencies; only inline styles.
 * - Always full-bleed, above starfield, behind headline/footer.
 * - If a PNG fails, we draw a soft radial glow as a fallback.
 */

const PLANETS = [
  // dir: normalized direction vector from center, speed in px/sec
  { src: "/planet/earth.png",   size: 160, dir: [-1, -0.35], speed: 38 },
  { src: "/planet/moon.png",    size: 110, dir: [ 1, -0.30], speed: 36 },
  { src: "/planet/mars.png",    size: 140, dir: [-0.7,  0.7], speed: 34 },
  { src: "/planet/saturn.png",  size: 200, dir: [ 0.7,  0.7], speed: 32 },
  { src: "/planet/jupiter.png", size: 220, dir: [ 0.2, -1.0], speed: 30 },
];

function PlanetImg({ src, size }) {
  const ref = useRef(null);
  // graceful fallback if image 404s
  const onError = () => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("src");
    el.style.background = "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), rgba(200,200,255,0.18) 60%, transparent 70%)";
    el.style.borderRadius = "9999px";
  };
  return (
    <img
      ref={ref}
      src={src}
      alt="planet"
      draggable={false}
      onError={onError}
      style={{
        position: "absolute",
        width: size,
        height: size,
        objectFit: "contain",
        willChange: "transform",
        filter: "drop-shadow(0 0 22px rgba(255,255,255,0.14))",
        pointerEvents: "none",
      }}
    />
  );
}

export default function AwakenedSky({ onContinue }) {
  const rootRef = useRef(null);
  const imgsRef = useRef([]); // DOM nodes for planets

  useEffect(() => {
    // lock scroll while visible
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll("[data-planet='1'] img, [data-planet='1'] div > img") || [];
    imgsRef.current = Array.from(nodes);

    let rafId = 0;
    let last = performance.now();
    const center = () => {
      const r = rootRef.current?.getBoundingClientRect();
      return r ? { cx: r.width / 2, cy: r.height / 2 } : { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
    };
    const bounds = () => {
      const pad = 120; // allow offscreen before ping-pong
      return { left: -pad, top: -pad, right: (rootRef.current?.clientWidth ?? window.innerWidth) + pad, bottom: (rootRef.current?.clientHeight ?? window.innerHeight) + pad };
    };

    // Per-planet mutable positions
    const planets = PLANETS.map((p, i) => ({
      ...p,
      x: 0, y: 0, scale: 0.9, // start at center
      vx: p.dir[0] * p.speed, vy: p.dir[1] * p.speed,
      phase: Math.random() * Math.PI * 2,
      el: imgsRef.current[i] || null,
    }));

    const animate = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); // seconds, clamp for stability
      last = t;

      const { cx, cy } = center();
      const b = bounds();

      planets.forEach((p, i) => {
        // add a slight curved wobble
        p.phase += dt * 0.6;
        const wobbleX = Math.sin(p.phase + i) * 12;
        const wobbleY = Math.cos(p.phase * 0.9 + i) * 10;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // ping-pong when far off screen
        if (p.x + cx < b.left || p.x + cx > b.right) p.vx *= -1;
        if (p.y + cy < b.top  || p.y + cy > b.bottom) p.vy *= -1;

        // gentle breathe scale
        p.scale = 0.92 + Math.sin(t * 0.001 + i) * 0.06;

        const el = p.el;
        if (el) {
          el.style.transform = `translate(${Math.round(cx + p.x + wobbleX)}px, ${Math.round(cy + p.y + wobbleY)}px) translate(-50%, -50%) scale(${p.scale})`;
        }
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, width: "100dvw", height: "100dvh", zIndex: 99999, color: "white", overflow: "hidden" }}>
      {/* Planets layer (data-planet marker so we can query reliably) */}
      <div ref={rootRef} data-planet="1" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {PLANETS.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: "50%", top: "50%" }}>
            <PlanetImg src={p.src} size={p.size} />
          </div>
        ))}
      </div>

      {/* Headline */}
      <div style={{ position: "absolute", insetInline: 0, top: "12vh", textAlign: "center", paddingInline: "1rem", zIndex: 2 }}>
        <div style={{ fontSize: "clamp(22px,4vw,44px)", fontWeight: 600, textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div style={{ opacity: 0.8, marginTop: 8 }}>Walk it. Share it. Build with it.</div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", insetInline: 0, bottom: "10vh", textAlign: "center", paddingInline: "1rem", zIndex: 2, pointerEvents: "auto" }}>
        <div style={{ opacity: 0.85, marginBottom: 12 }}>Breathe… your direction is clear.</div>
        <button
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
          style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(16,185,129,0.9)", color: "#000", fontWeight: 700, boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
        >
          Continue
        </button>
      </div>
    </div>,
    document.body
  );
}
