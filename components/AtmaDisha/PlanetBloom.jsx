"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

export default function PlanetBloom({ answers, onComplete }){
  useEffect(() => {
    const t = setTimeout(() => { if(typeof onComplete === "function") onComplete(); }, 2400);
    return () => clearTimeout(t);
  }, [onComplete]);

  const orbits = [
    { rotate: 0,   delay: 0.0 },
    { rotate: 72,  delay: 0.1 },
    { rotate: 144, delay: 0.2 },
    { rotate: 216, delay: 0.3 },
  ];

  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-semibold">Your Ātma Diśā is awakened.</div>
      <div className="opacity-80 mt-1">Five roots now guide your path.</div>

      <div className="relative mx-auto mt-8" style={{ width: 320, height: 320 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 grid place-items-center"
        >
          <div className="w-28 h-28 rounded-full bg-white/10 border border-white/25 backdrop-blur" />
        </motion.div>

        {orbits.map((o, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: o.delay }}
            className="absolute inset-0"
            style={{ transform: `rotate(${o.rotate}deg)` }}
          >
            <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -95px)` }}>
              <div className="w-6 h-6 rounded-full bg-white/40 blur-sm" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
