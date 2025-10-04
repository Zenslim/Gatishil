"use client";
import React from "react";
import { motion } from "framer-motion";

export default function PlanetScene({ element, index, total, label }){
  const dir = element.planet.from || "left";
  const variants = {
    left:  { initial: { x: "-60vw", y: 0, scale: 0.9 }, animate: { x: 0, y: 0, scale: 1.06 } },
    right: { initial: { x: "60vw",  y: 0, scale: 0.9 }, animate: { x: 0, y: 0, scale: 1.06 } },
    top:   { initial: { x: 0, y: "-50vh", scale: 0.9 }, animate: { x: 0, y: 0, scale: 1.06 } },
    bottom:{ initial: { x: 0, y: "50vh",  scale: 0.9 }, animate: { x: 0, y: 0, scale: 1.06 } },
    depth: { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1.08 } },
  }[dir];

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <motion.img
        src={element.planet.src}
        alt={label || element.planet.name}
        initial={variants.initial}
        animate={variants.animate}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="w-[180px] h-[180px] object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.15)] select-none pointer-events-none"
        draggable={false}
      />
      <div className="mt-3 text-sm opacity-80">{label}</div>
      <div className="mt-1 text-xs opacity-60">{index+1} / {total}</div>
    </div>
  );
}
