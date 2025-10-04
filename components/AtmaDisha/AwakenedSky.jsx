"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import CelestialBackground from "./CelestialBackground";

const PLANETS = [
  { src: "/planet/earth.png",   size: 90,  start: { x: "-15vw", y: "10vh"  }, end: { x: "115vw", y: "14vh"  }, delay: 0.0 },
  { src: "/planet/moon.png",    size: 58,  start: { x: "110vw", y: "32vh"  }, end: { x: "-20vw", y: "30vh"  }, delay: 0.1 },
  { src: "/planet/mars.png",    size: 72,  start: { x: "-20vw", y: "58vh"  }, end: { x: "120vw", y: "60vh"  }, delay: 0.2 },
  { src: "/planet/saturn.png",  size: 110, start: { x: "120vw", y: "72vh"  }, end: { x: "-25vw", y: "74vh"  }, delay: 0.3 },
  { src: "/planet/jupiter.png", size: 130, start: { x: "-18vw", y: "22vh"  }, end: { x: "118vw", y: "24vh"  }, delay: 0.15 },
];

export default function AwakenedSky({ onComplete, timeoutMs = 2600 }){
  useEffect(() => {
    const t = setTimeout(() => { if(typeof onComplete === "function") onComplete(); }, timeoutMs);
    return () => clearTimeout(t);
  }, [onComplete, timeoutMs]);

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden">
      <CelestialBackground />
      {/* Headline */}
      <div className="absolute inset-x-0 top-[12vh] text-center px-4">
        <div className="text-2xl md:text-4xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div className="opacity-80 mt-2">Walk it. Share it. Build with it.</div>
      </div>

      {/* Drifting planets */}
      {PLANETS.map((p, i) => (
        <motion.img
          key={i}
          src={p.src}
          alt="planet"
          initial={{ x: p.start.x, y: p.start.y, scale: 0.96, opacity: 0.85 }}
          animate={{ x: p.end.x, y: p.end.y, scale: 1.02, opacity: 1 }}
          transition={{ duration: 28, delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
          className="absolute object-contain pointer-events-none select-none"
          style={{ width: p.size, height: p.size, filter: "drop-shadow(0 0 30px rgba(255,255,255,0.12))" }}
          draggable={false}
        />
      ))}

      {/* Footer whisper */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4 opacity-85">
        Breathe… your direction is clear.
      </div>
    </div>
  );
}
