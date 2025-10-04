"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

export default function PlanetBloom({ answers, onComplete }){
  useEffect(() => {
    const t = setTimeout(() => { if(typeof onComplete === "function") onComplete(); }, 2400);
    return () => clearTimeout(t);
  }, [onComplete]);

  const orbs = [
    { r: 90, size: 26, color: "#FBBF24", delay: 0.0 },
    { r: 90, size: 24, color: "#67E8F9", delay: 0.1 },
    { r: 90, size: 24, color: "#FB923C", delay: 0.2 },
    { r: 90, size: 24, color: "#F472B6", delay: 0.3 },
    { r: 0,  size: 30, color: "#C084FC", delay: 0.4 }, // center pulse
  ];

  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-semibold">Your Ātma Diśā is awakened.</div>
      <div className="opacity-80 mt-1">Five roots now guide your path.</div>

      <div className="relative mx-auto mt-8" style={{ width: 320, height: 320 }}>
        {/* Center glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 grid place-items-center"
        >
          <div className="w-28 h-28 rounded-full bg-white/10 border border-white/25 backdrop-blur" />
        </motion.div>

        {/* Orbiters (no lines) */}
        {orbs.slice(0,4).map((o, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: o.delay }}
            className="absolute inset-0"
            style={{ transform: `rotate(${i*90}deg)` }}
          >
            <div className="absolute left-1/2 top-1/2"
                 style={{ transform: `translate(-50%, -${o.r}px)` }}>
              <div className="rounded-full"
                   style={{
                     width: o.size, height: o.size,
                     background: `radial-gradient(60% 60% at 35% 30%, ${o.color}, rgba(0,0,0,0.9) 60%)`,
                     boxShadow: `0 0 28px ${o.color}66`
                   }}/>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
