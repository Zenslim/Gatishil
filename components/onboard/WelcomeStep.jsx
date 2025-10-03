"use client";
import React from "react";

/**
 * WelcomeStep.jsx — self-contained
 * - Accepts optional `t`; falls back to defaults
 * - Uses Tailwind-only dark card so text is always visible
 */
export default function WelcomeStep({ t, onNext }) {
  const copy = t?.welcome ?? {
    title: "Welcome to the Chauṭarī.",
    subtitle: "Others are already sitting under the tree. Let’s introduce yourself.",
    begin: "Begin my circle",
    footer_privacy: "You control what you share. Your face helps real people connect.",
  };

  return (
    <section className="mx-auto max-w-xl rounded-2xl bg-neutral-950/90 border border-white/10 px-6 pt-10 pb-8 text-center shadow-2xl backdrop-blur">
      <div className="flex items-center justify-center mb-6">
        <div
          aria-hidden="true"
          className="w-20 h-20 rounded-2xl bg-neutral-900 grid place-items-center text-3xl"
          title="Chauṭarī"
        >
          🌳
        </div>
      </div>

      <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
      <p className="mt-3 text-base text-gray-300">{copy.subtitle}</p>

      <button
        type="button"
        onClick={() => (typeof onNext === "function" ? onNext() : null)}
        className="mt-8 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-500 active:bg-indigo-600 transition"
      >
        {copy.begin}
      </button>

      <p className="mt-6 text-xs text-gray-400">{copy.footer_privacy}</p>
    </section>
  );
}
