"use client";
import React from "react";

/**
 * OnboardCardLayout.jsx — shared dark canvas + glowing card
 * Use this wrapper for all onboarding steps to keep visuals uniform.
 */
export default function OnboardCardLayout({ children, width="max-w-xl", footer=null }) {
  return (
    <div className="min-h-[88vh] w-full bg-neutral-950">
      <div className="mx-auto px-4 py-10">
        <section className={`mx-auto ${width} rounded-2xl bg-neutral-900/90 border border-white/10 p-6 md:p-8 shadow-2xl backdrop-blur`}>
          {children}
        </section>
        {footer}
      </div>
    </div>
  );
}
