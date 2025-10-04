"use client";
import React from "react";
import { motion } from "framer-motion";
import CelestialBackground from "./CelestialBackground";

/**
 * AwakenedSky
 * - Shows all 5 planets drifting endlessly with mirror looping.
 * - Waits for user to click "Continue".
 */
const PLANETS = [
  // left → right
  { src: "/planet/earth.png",   size: 110, start: { x: "-20vw", y: "18vh" }, end: { x: "120vw", y: "20vh" }, delay: 0.0 },
  // right → left
  { src: "/planet/moon.png",    size: 70,  start: { x: "120vw", y: "36vh" }, end: { x: "-20vw", y: "38vh" }, delay: 0.2 },
  // top → bottom
  { src: "/planet/mars.png",    size: 86,  start: { x: "10vw",  y: "-20vh" }, end: { x: "12vw",  y: "120vh" }, delay: 0.1 },
  // bottom → top
  { src: "/planet/saturn.png",  size: 140, start: { x: "72vw",  y: "120vh" }, end: { x: "70vw",  y: "-20vh" }, delay: 0.25 },
  // diagonal sweep
  { src: "/planet/jupiter.png", size: 150, start: { x: "-22vw", y: "82vh" }, end: { x: "122vw", y: "-16vh" }, delay: 0.15 },
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

      {/* Drifting planets (endless mirror motion) */}
      {PLANETS.map((p, i) => (
        <motion.img
          key={i}
          src={p.src}
          alt="planet"
          initial={{ x: p.start.x, y: p.start.y, scale: 0.96, opacity: 0.9 }}
          animate={{ x: p.end.x, y: p.end.y, scale: 1.04, opacity: 1 }}
          transition={{ duration: 36, delay: p.delay, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
          className="absolute object-contain pointer-events-none select-none"
          style={{ width: p.size, height: p.size, filter: "drop-shadow(0 0 34px rgba(255,255,255,0.14))" }}
          draggable={false}
        />
      ))}

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-[10vh] text-center px-4">
        <div className="opacity-85 mb-4">Breathe… your direction is clear.</div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold shadow-lg"
          onClick={() => typeof onContinue === "function" ? onContinue() : null}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
