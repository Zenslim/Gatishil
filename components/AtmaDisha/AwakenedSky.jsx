"use client";
import React from "react";
import { motion } from "framer-motion";
import CelestialBackground from "./CelestialBackground";

/**
 * AwakenedSky (curved paths + pulsing CTA)
 * - 5 planets follow gentle Bezier-like arcs using keyframe x/y arrays.
 * - Infinite mirror loop so they appear/disappear at edges.
 * - Continue button has a calm pulse and hover lift.
 */
const PLANETS = [
  {
    src: "/planet/earth.png", size: 110,
    x: ["-20vw","20vw","60vw","120vw"],
    y: ["18vh","12vh","22vh","20vh"],
    delay: 0.0
  },
  {
    src: "/planet/moon.png", size: 72,
    x: ["120vw","82vw","38vw","-20vw"],
    y: ["36vh","40vh","34vh","38vh"],
    delay: 0.2
  },
  {
    src: "/planet/mars.png", size: 86,
    x: ["10vw","16vw","20vw","12vw"],
    y: ["-20vh","28vh","62vh","120vh"],
    delay: 0.12
  },
  {
    src: "/planet/saturn.png", size: 140,
    x: ["72vw","75vw","72vw","70vw"],
    y: ["120vh","92vh","42vh","-20vh"],
    delay: 0.25
  },
  {
    src: "/planet/jupiter.png", size: 150,
    x: ["-22vw","24vw","78vw","122vw"],
    y: ["82vh","64vh","12vh","-16vh"],
    delay: 0.18
  },
];

export default function AwakenedSky({ onContinue }){
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

      {/* Drifting planets (curved mirror motion) */}
      {PLANETS.map((p, i) => (
        <motion.img
          key={i}
          src={p.src}
          alt="planet"
          initial={{ x: p.x[0], y: p.y[0], scale: 0.96, opacity: 0.9 }}
          animate={{ x: p.x, y: p.y, scale: [0.96,1.04,1.02,1.04], opacity: 1 }}
          transition={{ duration: 34, times: [0,0.33,0.67,1], delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
          className="absolute object-contain pointer-events-none select-none"
          style={{ width: p.size, height: p.size, filter: "drop-shadow(0 0 34px rgba(255,255,255,0.14))" }}
          draggable={false}
        />
      ))}

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4">
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
    </div>
  );
}

