"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * AwakenedSky v6.5
 * - Animates 5 planets with requestAnimationFrame.
 * - Explicit refs (no querySelector), inline styles only.
 * - Ultra-high z-index; debug guides to verify layer visibility.
 */

const PLANETS = [
  { src: "/planet/earth.png",   size: 160, dir: [-1,  -0.35], speed: 38 },
  { src: "/planet/moon.png",    size: 110, dir: [ 1,  -0.30], speed: 36 },
  { src: "/planet/mars.png",    size: 140, dir: [-0.7,  0.7], speed: 34 },
  { src: "/planet/saturn.png",  size: 200, dir: [ 0.7,  0.7], speed: 32 },
  { src: "/planet/jupiter.png", size: 220, dir: [ 0.2, -1.00], speed: 30 },
];

export default function AwakenedSky({ onContinue }){
  const rootRef = useRef(null);
  const refs = useRef(PLANETS.map(() => React.createRef()));

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const els = refs.current.map(r => r.current).filter(Boolean);
    els.forEach((el) => {
      if (!el) return;
      el.onerror = () => {
        el.removeAttribute("src");
        el.style.background = "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), rgba(200,200,255,0.18) 60%, transparent 70%)";
        el.style.borderRadius = "9999px";
      };
    });

    let raf = 0;
    let last = performance.now();
    const state = PLANETS.map((p) => ({
      ...p, x: 0, y: 0, vx: p.dir[0]*p.speed, vy:p.dir[1]*p.speed, phase: Math.random()*Math.PI*2, scale: 0.95
    }));

    function center() {
      const r = rootRef.current?.getBoundingClientRect();
      return r ? { cx: r.width/2, cy: r.height/2 } : { cx: window.innerWidth/2, cy: window.innerHeight/2 };
    }
    function bounds() {
      const pad = 120;
      const w = rootRef.current?.clientWidth ?? window.innerWidth;
      const h = rootRef.current?.clientHeight ?? window.innerHeight;
      return { left:-pad, top:-pad, right:w+pad, bottom:h+pad };
    }

    function tick(t){
      const dt = Math.min(0.05, (t-last)/1000); last = t;
      const { cx, cy } = center();
      const b = bounds();

      state.forEach((p, i) => {
        p.phase += dt * 0.6;
        const wobX = Math.sin(p.phase + i) * 12;
        const wobY = Math.cos(p.phase*0.9 + i) * 10;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x + cx < b.left || p.x + cx > b.right) p.vx *= -1;
        if (p.y + cy < b.top  || p.y + cy > b.bottom) p.vy *= -1;
        p.scale = 0.94 + Math.sin(t*0.001 + i) * 0.06;

        const el = refs.current[i].current;
        if (el) {
          el.style.transform = `translate(${Math.round(cx + p.x + wobX)}px, ${Math.round(cy + p.y + wobY)}px) translate(-50%, -50%) scale(${p.scale})`;
        }
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div style={{ position:"fixed", inset:0, width:"100dvw", height:"100dvh", zIndex: 99999, color:"#fff", overflow:"hidden" }}>
      {/* PLANETS LAYER */}
      <div ref={rootRef} style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        {/* center guide (debug) */}
        <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:6, height:6, background:"#0ff", borderRadius:99, opacity:0.8 }} />
        {PLANETS.map((p, i) => (
          <img
            key={i}
            ref={refs.current[i]}
            src={p.src}
            alt="planet"
            draggable={false}
            style={{
              position:"absolute", left:"50%", top:"50%",
              transform:"translate(-50%, -50%)",
              width:p.size, height:p.size, objectFit:"contain",
              willChange:"transform",
              filter:"drop-shadow(0 0 22px rgba(255,255,255,0.14))",
              outline:"1px solid rgba(255,255,255,0.15)"
            }}
          />
        ))}
      </div>

      {/* HEADLINE */}
      <div style={{ position:"absolute", insetInline:0, top:"12vh", textAlign:"center", paddingInline:"1rem", zIndex:2 }}>
        <div style={{ fontSize:"clamp(22px,4vw,44px)", fontWeight:600, textShadow:"0 2px 6px rgba(0,0,0,0.4)" }}>
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div style={{ opacity:0.8, marginTop:8 }}>Walk it. Share it. Build with it.</div>
      </div>

      {/* CTA */}
      <div style={{ position:"absolute", insetInline:0, bottom:"10vh", textAlign:"center", paddingInline:"1rem", zIndex:2, pointerEvents:"auto" }}>
        <div style={{ opacity:0.85, marginBottom:12 }}>Breathe… your direction is clear.</div>
        <button
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
          style={{ padding:"10px 18px", borderRadius:12, background:"rgba(16,185,129,0.9)", color:"#000", fontWeight:700, boxShadow:"0 6px 16px rgba(0,0,0,0.35)" }}
        >Continue</button>
      </div>
    </div>,
    document.body
  );
}
