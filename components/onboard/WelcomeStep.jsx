"use client";
import React from "react";
import OnboardCardLayout from "./OnboardCardLayout";

/**
 * Unified WelcomeStep — dark card, DAO yellow CTA, consistent copy
 */
export default function WelcomeStep({ t, onNext }) {
  const copy = t?.welcome ?? {
    title: "Welcome to the Chauṭarī.",
    subtitle: "Others are already sitting under the tree. Let’s introduce yourself.",
    begin: "Begin my circle",
    footer_privacy: "You control what you share. Your face helps real people connect.",
  };

  return (
    <OnboardCardLayout>
      <div className="flex items-center justify-center mb-6">
        <div aria-hidden="true" className="w-20 h-20 rounded-2xl bg-neutral-800 grid place-items-center text-3xl" title="Chauṭarī">🌳</div>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center">{copy.title}</h1>
      <p className="mt-3 text-base text-gray-300 text-center">{copy.subtitle}</p>
      <button
        type="button"
        onClick={() => (typeof onNext === "function" ? onNext() : null)}
        className="mt-8 w-full rounded-2xl bg-yellow-500 px-5 py-3 text-black font-semibold hover:bg-yellow-400 active:bg-yellow-500 transition"
      >
        {copy.begin}
      </button>
      <p className="mt-6 text-xs text-gray-400 text-center">{copy.footer_privacy}</p>
    </OnboardCardLayout>
  );
}
