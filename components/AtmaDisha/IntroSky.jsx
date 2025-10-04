"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const PLANETS = [
  { src: "/planet/earth.png",   size: 140, delay: 0.00, dir: [-40,-18] },
  { src: "/planet/moon.png",    size: 90,  delay: 0.05, dir: [ 32,-16] },
  { src: "/planet/mars.png",    size: 110, delay: 0.08, dir: [-24, 26] },
  { src: "/planet/saturn.png",  size: 170, delay: 0.10, dir: [ 28, 22] },
  { src: "/planet/jupiter.png", size: 190, delay: 0.06, dir: [  2,-32] },
];

export default function IntroSky({ onDone, duration = 2200 }){
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => { document.body.style.overflow = prevOverflow; onDone?.(); }, duration);
    return () => { clearTimeout(t); document.body.style.overflow = prevOverflow; };
  }, [onDone, duration]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 w-[100dvw] h-[100dvh] z-[50] overflow-hidden text-white">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {PLANETS.map((p, i) => (
          <motion.img
            key={i}
            src={p.src}
            alt="planet"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
            animate={{ x: [`${0}vw`, `${p.dir[0]}vw`], y: [`${0}vh`, `${p.dir[1]}vh`], scale: [0.2, 1.05], opacity: [0, 1] }}
            transition={{ duration: 1.6, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
            className="absolute object-contain select-none drop-shadow-[0_0_34px_rgba(255,255,255,0.14)]"
            style={{ width: p.size, height: p.size }}
            draggable={false}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-[14vh] text-center px-4">
        <div className="text-sm opacity-85">Entering Ātma Diśā…</div>
      </div>
    </div>,
    document.body
  );
}
