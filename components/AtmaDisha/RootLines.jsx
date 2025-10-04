"use client";
import React from "react";

export default function RootLines({ answers }){
  // Simple decorative lines that appear as answers accumulate
  const keys = Object.keys(answers || {});
  const count = keys.length;

  if(count === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* center */}
      <circle cx="50" cy="50" r="0.4" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.2"/>
      {/* spokes */}
      {count >= 1 && <line x1="50" y1="50" x2="50" y2="85" stroke="rgba(251,191,36,0.55)" strokeWidth="0.4" />}
      {count >= 2 && <line x1="50" y1="50" x2="20" y2="50" stroke="rgba(103,232,249,0.55)" strokeWidth="0.4" />}
      {count >= 3 && <line x1="50" y1="50" x2="50" y2="20" stroke="rgba(251,146,60,0.55)" strokeWidth="0.4" />}
      {count >= 4 && <line x1="50" y1="50" x2="80" y2="50" stroke="rgba(244,114,182,0.55)" strokeWidth="0.4" />}
      {count >= 5 && <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(192,132,252,0.55)" strokeWidth="0.35" />}
    </svg>
  );
}
