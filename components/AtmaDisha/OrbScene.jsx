"use client";
import React from "react";
import { motion } from "framer-motion";

export default function OrbScene({ element, index, total }){
  const size = 160;
  const delay = 0.1;

  const entryVariants = {
    earth: { y: 40, opacity: 0, scale: 0.9 },
    water: { x: -40, opacity: 0, scale: 0.9 },
    fire: { y: -40, opacity: 0, scale: 0.9 },
    air: { x: 40, opacity: 0, scale: 0.9 },
    space: { opacity: 0, scale: 0.85 },
  };

  const animateTo = {
    opacity: 1, scale: 1, x: 0, y: 0,
    filter: "drop-shadow(0 0 24px rgba(255,255,255,0.35))"
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <motion.div
        initial={entryVariants[element.id] || { opacity: 0, scale: 0.9 }}
        animate={animateTo}
        transition={{ duration: 0.9, delay }}
        className="relative"
        aria-label={element.label}
        role="img"
      >
        <div
          className="rounded-full"
          style={{
            width: size, height: size,
            background: `radial-gradient( circle at 30% 30%, ${element.color}, rgba(0,0,0,0.8) )`,
            boxShadow: `0 0 40px ${element.color}30, inset 0 0 120px #000`
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ boxShadow: [`0 0 0px ${element.color}00`, `0 0 36px ${element.color}66`, `0 0 0px ${element.color}00`] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <div className="mt-3 text-sm opacity-80">{element.label}</div>
      <div className="mt-1 text-xs opacity-60">{index+1} / {total}</div>
    </div>
  );
}
