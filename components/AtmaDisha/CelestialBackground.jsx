"use client";
import React, { useMemo } from "react";

function StarsLayer({ count = 160, speed = 80, blur = 0, opacity = 0.9 }){
  const stars = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const size = (i % 7 === 0) ? 2.4 : 1.1;
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const tw = 3 + Math.random() * 5;
    return (
      <div
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          width: size, height: size, top: `${top}%`, left: `${left}%`, opacity,
          filter: blur ? `blur(${blur}px)` : undefined,
          animation: `twinkle ${tw}s infinite ease-in-out`
        }}
      />
    );
  }), [count, blur, opacity]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ animation: `driftY ${speed}s linear infinite` }}>
      {stars}
    </div>
  );
}

export default function CelestialBackground(){
  return (
    <div className="absolute inset-0 bg-black">
      <style jsx global>{`
        @keyframes twinkle { 0%,100%{opacity:.25; transform:scale(1)} 50%{opacity:.9; transform:scale(1.2)} }
        @keyframes driftY { 0%{ transform: translateY(0px) } 100%{ transform: translateY(-160px) } }
        @keyframes nebulaPan { 0%{ transform: translate(-12%, -10%) scale(1.1) } 100%{ transform: translate(10%, 8%) scale(1.1) } }
      `}</style>
      <StarsLayer count={160} speed={100} opacity={0.7} />
      <StarsLayer count={110} speed={140} blur={1} opacity={0.5} />
      <div
        className="absolute -inset-1 opacity-[0.18] mix-blend-screen pointer-events-none"
        style={{
          background: "radial-gradient(1200px 800px at 30% 60%, rgba(192,132,252,0.45), transparent 60%), radial-gradient(1000px 600px at 70% 30%, rgba(103,232,249,0.32), transparent 55%)",
          animation: "nebulaPan 42s ease-in-out infinite alternate"
        }}
      />
    </div>
  );
}
