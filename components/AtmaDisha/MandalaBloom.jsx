"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

export default function MandalaBloom({ answers, onComplete }){
  useEffect(() => {
    const t = setTimeout(() => {
      if(typeof onComplete === "function") onComplete();
    }, 2400);
    return () => clearTimeout(t);
  }, [onComplete]);

  const petals = [
    { r: 80, rotate: 0 },
    { r: 80, rotate: 72 },
    { r: 80, rotate: 144 },
    { r: 80, rotate: 216 },
    { r: 80, rotate: 288 },
  ];

  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-semibold">Your Ātma Diśā is awakened.</div>
      <div className="opacity-80 mt-1">Five roots now guide your path.</div>
      <div className="relative mx-auto mt-6" style={{ width: 240, height: 240 }}>
        {petals.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5, rotate: p.rotate }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 * i }}
            className="absolute inset-0 grid place-items-center"
            style={{ transform: `rotate(${p.rotate}deg)` }}
          >
            <div className="w-28 h-14 rounded-full bg-gradient-to-r from-amber-300/40 to-fuchsia-400/40 blur-md" />
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="absolute inset-0 grid place-items-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/30 backdrop-blur" />
        </motion.div>
      </div>
    </div>
  );
}
