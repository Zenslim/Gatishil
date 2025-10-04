"use client";
import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import CelestialBackground from "./CelestialBackground";

/**
 * AwakenedSky (center zoom & radial drift)
 * - All planets spawn near center (slightly jittered), zoom out while traveling
 *   in different directions until offscreen, then mirror back.
 * - Rendered as a portal to guarantee full-bleed.
 */
const PLANETS = [
  { src: "/planet/earth.png",   size: 110, dir: "leftUp",   delay: 0.00, dur: 34 },
  { src: "/planet/moon.png",    size: 72,  dir: "rightUp",  delay: 0.10, dur: 26 },
  { src: "/planet/mars.png",    size: 86,  dir: "leftDown", delay: 0.18, dur: 30 },
  { src: "/planet/saturn.png",  size: 140, dir: "rightDown",delay: 0.25, dur: 38 },
  { src: "/planet/jupiter.png", size: 150, dir: "up",       delay: 0.14, dur: 36 },
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
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 w-[100vw] h-[100vh] text-white overflow-hidden z-[60]">
      <CelestialBackground />

      {/* Headline */}
      <div className="absolute inset-x-0 top-[12vh] text-center px-4">
        <div className="text-2xl md:text-4xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          Your Ātma Diśā — your <em>Reason for Being</em> — is awakened.
        </div>
        <div className="opacity-80 mt-2">Walk it. Share it. Build with it.</div>
      </div>

      {/* Center-origin planets */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {PLANETS.map((p, i) => {
          const path = pathFor(p.dir);
          return (
            <motion.img
              key={i}
              src={p.src}
              alt="planet"
              initial={{ x: path.x[0], y: path.y[0], scale: 0.75, opacity: 0.95 }}
              animate={{ x: path.x, y: path.y, scale: [0.75, 1.05, 0.96, 1.02], opacity: 1 }}
              transition={{ duration: p.dur, times: [0,0.33,0.67,1], delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
              className="absolute object-contain select-none drop-shadow-[0_0_34px_rgba(255,255,255,0.14)]"
              style={{ width: p.size, height: p.size }}
              draggable={false}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4 pointer-events-auto">
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
