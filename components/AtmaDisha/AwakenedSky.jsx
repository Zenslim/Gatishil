"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FILES = {
  earth: "/planet/earth.png",
  moon: "/planet/moon.png",
  mars: "/planet/mars.png",
  saturn: "/planet/saturn.png",
  jupiter: "/planet/jupiter.png",
};

const PLANETS = [
  { key: "earth",   size: 180, dir: [-1.00, -0.35], speed: 36 },
  { key: "moon",    size: 120, dir: [ 1.00, -0.30], speed: 34 },
  { key: "mars",    size: 160, dir: [-0.70,  0.70], speed: 32 },
  { key: "saturn",  size: 220, dir: [ 0.70,  0.70], speed: 30 },
  { key: "jupiter", size: 240, dir: [ 0.20, -1.00], speed: 28 },
];

function Planet({ src, size }, ref){
  return (
    <img
      ref={ref}
      alt="planet"
      draggable={false}
      src={src}
      onError={(e) => {
        const el = e.currentTarget;
        el.removeAttribute("src");
        el.style.background = "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.95), rgba(200,200,255,0.18) 60%, transparent 70%)";
        el.style.borderRadius = "9999px";
      }}
      style={{ position:"absolute", width:size, height:size, objectFit:"contain", left:"50%", top:"50%", transform:"translate(-50%,-50%) scale(0.2)", willChange:"transform", filter:"drop-shadow(0 0 22px rgba(255,255,255,0.14))" }}
    />
  );
}
const PlanetImg = React.forwardRef(Planet);

export default function AwakenedSky({ onContinue }){
  const rootRef = useRef(null);
  const refs = useRef(PLANETS.map(() => React.createRef()));

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const start = last;
    const state = PLANETS.map((p) => ({ ...p, x:0, y:0, vx:p.dir[0]*p.speed, vy:p.dir[1]*p.speed, phase:Math.random()*Math.PI*2, scale:0.2 }));

    const center = () => {
      const r = rootRef.current?.getBoundingClientRect();
      return r ? { cx:r.width/2, cy:r.height/2 } : { cx:window.innerWidth/2, cy:window.innerHeight/2 };
    };
    const bounds = () => {
      const pad = 120, w = rootRef.current?.clientWidth ?? window.innerWidth, h = rootRef.current?.clientHeight ?? window.innerHeight;
      return { left:-pad, top:-pad, right:w+pad, bottom:h+pad };
    };

    function tick(t){
      const dt = Math.min(0.05, (t-last)/1000); last = t;
      const { cx, cy } = center(); const b = bounds();
      const elapsed = (t - start)/1000; const burstDone = elapsed >= 1.2;

      state.forEach((p, i) => {
        const el = refs.current[i].current; if (!el) return;
        if (!burstDone) {
          const k = Math.min(1, elapsed / 1.2);
          const ease = 1 - Math.pow(1 - k, 3);
          p.scale = 0.2 + ease * 0.8;
          el.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px) translate(-50%, -50%) scale(${p.scale})`;
        } else {
          p.phase += dt * 0.6;
          const wobX = Math.sin(p.phase + i) * 12;
          const wobY = Math.cos(p.phase * 0.9 + i) * 10;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x + cx < b.left || p.x + cx > b.right) p.vx *= -1;
          if (p.y + cy < b.top  || p.y + cy > b.bottom) p.vy *= -1;
          p.scale = 0.96 + Math.sin(t * 0.001 + i) * 0.04;
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
    <div style={{ position:"fixed", inset:0, width:"100dvw", height:"100dvh", zIndex:99999, color:"#fff", overflow:"hidden" }}>
      <div ref={rootRef} style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        {PLANETS.map((p, i) => (<PlanetImg key={i} ref={refs.current[i]} size={p.size} src={FILES[p.key]} />))}
      </div>
      <div style={{ position:"absolute", insetInline:0, top:"12vh", textAlign:"center", paddingInline:"1rem", zIndex:2 }}>
        <div style={{ fontSize:"clamp(22px,4vw,44px)", fontWeight:600, textShadow:"0 2px 6px rgba(0,0,0,0.4)" }}>
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div style={{ opacity:0.8, marginTop:8 }}>Walk it. Share it. Build with it.</div>
      </div>
      <div style={{ position:"absolute", insetInline:0, bottom:"10vh", textAlign:"center", paddingInline:"1rem", zIndex:2, pointerEvents:"auto" }}>
        <div style={{ opacity:0.85, marginBottom:12 }}>Breathe… your direction is clear.</div>
        <button onClick={() => typeof onContinue === "function" ? onContinue() : null}
          style={{ padding:"10px 18px", borderRadius:12, background:"rgba(16,185,129,0.9)", color:"#000", fontWeight:700, boxShadow:"0 6px 16px rgba(0,0,0,0.35)" }}>Continue</button>
      </div>
    </div>,
    document.body
  );
}
