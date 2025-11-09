"use client";
import React from "react";
import { motion } from "framer-motion";

export default function OrbScene({ element, index, total, whispers }){
  const size = 180;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative"
        aria-label={element.label}
        role="img"
      >
        {/* Planet-style orb */}
        <div
          className="rounded-full animate-[planetspin_24s_linear_infinite]"
          style={{
            width: size, height: size,
            background: `radial-gradient(60% 60% at 35% 30%, ${element.color}, rgba(0,0,0,0.9) 60%), radial-gradient(140% 90% at 70% 80%, rgba(255,255,255,0.15), transparent)`,
            boxShadow: `0 0 40px ${element.color}40, inset -10px -12px 60px rgba(0,0,0,0.6)`
          }}
        />
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 60px ${element.color}55` }}
        />
        <style jsx>{`
          @keyframes planetspin {
            0% { filter: hue-rotate(0deg); } 
            100% { filter: hue-rotate(2deg); }
          }
        `}</style>
      </motion.div>

      <div className="mt-3 text-sm opacity-80">{element.label}</div>
      <div className="mt-1 text-xs opacity-60">{index+1} / {total}</div>

      <div className="mt-6 text-lg md:text-xl opacity-90 min-h-[3rem]">
        {/* Rotate whisper gently */}
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {whispers[0]}
        </motion.div>
      </div>
    </div>
  );
}
