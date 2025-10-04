"use client";
import React, { useMemo } from "react";

function StarsLayer({ count = 140, speed = 60, blur = 0 }){
  const stars = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const size = (i % 7 === 0) ? 2.4 : 1.2;
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const tw = 3 + Math.random() * 5;
    return (
      <div
        key={i}
        className="absolute rounded-full bg-white/80"
        style={{
          width: size, height: size, top: `${top}%`, left: `${left}%`,
          filter: blur ? `blur(${blur}px)` : undefined,
          animation: `twinkle ${tw}s infinite ease-in-out`
        }}
      />
    );
  }), [count, blur]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: `driftY ${speed}s linear infinite` }}>
      {stars}
    </div>
  );
}

export default function CelestialBackground(){
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <style jsx global>{`
        @keyframes twinkle { 0%,100%{opacity:.25; transform:scale(1)} 50%{opacity:.9; transform:scale(1.2)} }
        @keyframes driftY { 0%{ transform: translateY(0px) } 100%{ transform: translateY(-120px) } }
        @keyframes nebulaPan { 0%{ transform: translate(-10%, -10%) scale(1.1) } 100%{ transform: translate(10%, 10%) scale(1.1) } }
      `}</style>

      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.06), transparent 45%)" }} />

      <StarsLayer count={140} speed={90} />
      <StarsLayer count={90} speed={130} blur={1} />

      <div
        className="absolute -inset-1 opacity-[0.18] mix-blend-screen pointer-events-none"
        style={{
          background: "radial-gradient(1200px 800px at 30% 60%, rgba(192,132,252,0.5), transparent 60%), radial-gradient(1000px 600px at 70% 30%, rgba(103,232,249,0.35), transparent 55%)",
          animation: "nebulaPan 40s ease-in-out infinite alternate"
        }}
      />
    </div>
  );
}
