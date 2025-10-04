"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Simplified IntroSky — fades planets then auto-calls onDone.
 * No portal overlay so AtmaDisha can naturally proceed.
 */

const PLANETS = [
  { src: "/planet/earth.png", size: 140, delay: 0.00, dir: [-40,-18] },
  { src: "/planet/moon.png",  size: 90,  delay: 0.05, dir: [ 32,-16] },
  { src: "/planet/mars.png",  size: 110, delay: 0.08, dir: [-24, 26] },
  { src: "/planet/saturn.png",size: 170, delay: 0.10, dir: [ 28, 22] },
  { src: "/planet/jupiter.png",size:190, delay: 0.06, dir: [  2,-32] },
];

export default function IntroSky({ onDone, duration = 2500 }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <div className="absolute inset-0 bg-black text-white flex items-center justify-center overflow-hidden z-[1]">
      <div className="relative w-full h-full pointer-events-none">
        {PLANETS.map((p, i) => (
          <motion.img
            key={i}
            src={p.src}
            alt="planet"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
            animate={{
              x: [`0vw`, `${p.dir[0]}vw`],
              y: [`0vh`, `${p.dir[1]}vh`],
              scale: [0.2, 1.05],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 2, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_34px_rgba(255,255,255,0.14)]"
            style={{ width: p.size, height: p.size }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            draggable={false}
          />
        ))}
      </div>
      <div className="absolute bottom-[12vh] text-center w-full text-sm opacity-80">
        Entering Ātma Diśā…
      </div>
    </div>
  );
}