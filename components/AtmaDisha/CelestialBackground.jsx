"use client";
import React, { useMemo } from "react";

function Star({ i }){
  const size = (i % 5 === 0) ? 2.4 : 1.4;
  const top = Math.random() * 100;
  const left = Math.random() * 100;
  const dur = 4 + Math.random() * 6;
  return (
    <div
      className="absolute rounded-full opacity-70"
      style={{ width: size, height: size, top: `${top}%`, left: `${left}%`, animation: `twinkle ${dur}s infinite ease-in-out` }}
    />
  );
}

export default function CelestialBackground(){
  const stars = useMemo(() => Array.from({ length: 120 }).map((_, i) => <Star i={i} key={i} />), []);
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black">
      <style jsx global>{`
        @keyframes twinkle { 0%,100%{opacity:.2; transform:scale(1)} 50%{opacity:.9; transform:scale(1.2)} }
      `}</style>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.05), transparent 40%)" }} />
      <div className="absolute inset-0">{stars}</div>
    </div>
  );
}
