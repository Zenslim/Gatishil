"use client";
import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import CelestialBackground from "./CelestialBackground";

/**
 * AwakenedSky rendered in a PORTAL to <body> to escape any parent padding.
 * This guarantees true edge-to-edge on mobile (like PasaGuthi).
 */
const PLANETS = [
  { src: "/planet/earth.png", size: 110, x: ["-20vw","20vw","60vw","120vw"], y: ["18vh","12vh","22vh","20vh"],  scale: [0.95,1.06,1.0,1.05], delay: 0.0, duration: 36 },
  { src: "/planet/moon.png",  size: 72,  x: ["120vw","82vw","38vw","-20vw"], y: ["36vh","40vh","34vh","38vh"],  scale: [0.96,1.02,0.98,1.03], delay: 0.2, duration: 28 },
  { src: "/planet/mars.png",  size: 86,  x: ["10vw","16vw","20vw","12vw"],  y: ["-20vh","28vh","62vh","120vh"], scale: [0.92,1.05,0.97,1.03], delay: 0.12, duration: 32 },
  { src: "/planet/saturn.png",size: 140, x: ["72vw","75vw","72vw","70vw"],  y: ["120vh","92vh","42vh","-20vh"], scale: [0.94,1.04,0.98,1.02], delay: 0.25, duration: 40 },
  { src: "/planet/jupiter.png", size: 150, x: ["-22vw","24vw","78vw","122vw"], y: ["82vh","64vh","12vh","-16vh"], scale: [0.93,1.07,0.99,1.04], delay: 0.18, duration: 38 },
];

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

      {/* Drifting planets with breathe zoom */}
      {PLANETS.map((p, i) => (
        <motion.img
          key={i}
          src={p.src}
          alt="planet"
          initial={{ x: p.x[0], y: p.y[0], scale: p.scale[0], opacity: 0.9 }}
          animate={{ x: p.x, y: p.y, scale: p.scale, opacity: 1 }}
          transition={{ duration: p.duration, times: [0,0.33,0.67,1], delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
          className="absolute object-contain pointer-events-none select-none"
          style={{ width: p.size, height: p.size, filter: "drop-shadow(0 0 34px rgba(255,255,255,0.14))" }}
          draggable={false}
        />
      ))}

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
