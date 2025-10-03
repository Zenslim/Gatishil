"use client";
import React from "react";

/**
 * components/onboard/JanmandalStep.jsx — Temporary stub
 * Replace later with full Ikigai/Janmandal screen.
 */
export default function JanmandalStep({ onDone }) {
  return (
    <div className="w-full max-w-xl text-white">
      <h2 className="text-2xl font-semibold">Janmandal (Ikigai) — Coming Next</h2>
      <p className="text-white/80 mt-2">
        We&apos;ll explore what you love, your gifts, and where you want to grow.
      </p>
      <button
        type="button"
        onClick={() => (typeof onDone === "function" ? onDone() : null)}
        className="mt-8 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500"
      >
        Finish
      </button>
    </div>
  );
}
