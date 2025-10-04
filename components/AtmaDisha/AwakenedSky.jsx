"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const PLANETS = [
  { src: "/planet/earth.png",   size: 150, dir: "leftUp",   delay: 0.00, dur: 34 },
  { src: "/planet/moon.png",    size: 100, dir: "rightUp",  delay: 0.10, dur: 26 },
  { src: "/planet/mars.png",    size: 130, dir: "leftDown", delay: 0.18, dur: 30 },
  { src: "/planet/saturn.png",  size: 200, dir: "rightDown",delay: 0.25, dur: 38 },
  { src: "/planet/jupiter.png", size: 220, dir: "up",       delay: 0.14, dur: 36 },
];

function pathFor(dir){
  switch(dir){
    case "leftUp":    return { x: ["0vw","-30vw","-60vw","-110vw"], y: ["0vh","-8vh","-18vh","-20vh"] };
    case "rightUp":   return { x: ["0vw","20vw","50vw","110vw"],     y: ["0vh","-6vh","-14vh","-18vh"] };
    case "leftDown":  return { x: ["0vw","-16vw","-48vw","-110vw"],  y: ["0vh","10vh","30vh","60vh"] };
    case "rightDown": return { x: ["0vw","14vw","40vw","110vw"],     y: ["0vh","14vh","26vh","60vh"] };
    case "up":        return { x: ["0vw","2vw","4vw","6vw"],         y: ["0vh","-20vh","-60vh","-110vh"] };
    default:          return { x: ["0vw","0vw","0vw","0vw"],         y: ["0vh","0vh","0vh","0vh"] };
  }
}

export default function AwakenedSky({ onContinue }){
  const [mounted, setMounted] = useState(false);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 w-[100dvw] h-[100dvh] text-white overflow-hidden z-[60]">
      {/* Headline */}
      <div className="absolute inset-x-0 top-[12vh] text-center px-4 z-[5]">
        <div className="text-2xl md:text-4xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div className="opacity-80 mt-2">Walk it. Share it. Build with it.</div>
      </div>

      {/* Planets layer (guaranteed visible) */}
      <div className="fixed inset-0 z-[4]" style={{ contain: "layout style", willChange: "transform" }}>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {PLANETS.map((p, i) => {
            const path = pathFor(p.dir);
            if (reduceMotion) {
              // Static fallback positions (still visible)
              const endX = path.x[path.x.length - 2];
              const endY = path.y[path.y.length - 2];
              return (
                <img
                  key={i}
                  src={p.src}
                  alt="planet"
                  className="absolute object-contain select-none"
                  style={{ width: p.size, height: p.size, transform: `translate(${endX}, ${endY}) scale(1)`, opacity: mounted ? 1 : 0 }}
                  draggable={false}
                />
              );
            }
            return (
              <motion.img
                key={i}
                src={p.src}
                alt="planet"
                initial={{ x: path.x[0], y: path.y[0], scale: 0.85, opacity: 0.99 }}
                animate={{ x: path.x, y: path.y, scale: [0.85, 1.07, 0.97, 1.02], opacity: 1 }}
                transition={{ duration: p.dur, times: [0,0.33,0.67,1], delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
                className="absolute object-contain select-none"
                style={{ width: p.size, height: p.size, willChange: "transform", filter: "drop-shadow(0 0 24px rgba(255,255,255,0.12))" }}
                draggable={false}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4 pointer-events-auto z-[5]">
        <div className="opacity-85 mb-4">Breathe… your direction is clear.</div>
        <motion.button
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ y: -2 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-lg"
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
        >
          Continue
        </motion.button>
      </div>
    </div>,
    document.body
  );
}
