"use client";
import React from "react";

/**
 * components/onboard/WelcomeStep.jsx — Pure presentational
 * - Shows tree illustration (🌳) or placeholder box
 * - Title + subtitle with exact wording
 * - Full-width "Begin my circle" button that calls onNext()
 */
export default function WelcomeStep({ onNext }) {
  return (
    <div className="w-full max-w-xl text-white">
      <div className="flex items-center justify-center mb-6">
        <div
          aria-hidden="true"
          className="w-24 h-24 rounded-2xl bg-neutral-900 grid place-items-center text-4xl"
          title="Chauṭarī"
        >
          🌳
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-center">
        Welcome to the Chauṭarī.
      </h1>
      <p className="text-center text-white/80 mt-2">
        Others are already sitting under the tree. Let’s introduce yourself.
      </p>

      <button
        type="button"
        onClick={() => (typeof onNext === "function" ? onNext() : null)}
        className="mt-8 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 transition"
      >
        Begin my circle
      </button>

      <p className="text-center text-xs text-white/60 mt-3">
        You control what you share. Your face helps real people connect.
      </p>
    </div>
  );
}
