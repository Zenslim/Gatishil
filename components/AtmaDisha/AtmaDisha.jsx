"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CelestialBackground from "./CelestialBackground";
import AwakenedSky from "./AwakenedSky";
import PlanetScene from "./PlanetScene";
import QuestionRotator from "./QuestionRotator";
import ComboBoxMulti from "./ComboBoxMulti";
import { loadOptions, bundledOptions } from "@/lib/atmaOptions";

let supabase = null;
try { supabase = require("@/lib/supabaseClient").default ?? null; } catch (_) { supabase = null; }

const ELEMENTS = [
  { key: "occupation", id: "earth",   staticLabel: "Your ROLE in SOCIETY", whispers: ["What work anchors your day?"] },
  { key: "skill",      id: "moon",    staticLabel: "What you are GOOD AT", whispers: ["What do you do effortlessly?"] },
  { key: "passion",    id: "mars",    staticLabel: "What you LOVE to do",  whispers: ["What lights your inner flame?"] },
  { key: "compassion", id: "saturn",  staticLabel: "What WORLD NEEDS",     whispers: ["What change does your community need?"] },
  { key: "vision",     id: "jupiter", staticLabel: "Your VISION & GOALS",  whispers: ["What vision guides you?"] },
];

export default function AtmaDisha({ onDone }){
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState("orbs"); // "orbs" -> "bloom"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [lists, setLists] = useState(bundledOptions);

  useEffect(() => { if (searchParams?.get("forceBloom") === "1") setPhase("bloom"); }, [searchParams]);
  useEffect(() => { (async () => { setLists(await loadOptions(supabase)); })(); }, []);

  const active = ELEMENTS[step];
  const options = (lists[active.key] ?? []).length ? lists[active.key] : bundledOptions[active.key];

  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden">
      <CelestialBackground />
      {phase === "bloom" ? (
        <AwakenedSky onContinue={() => (typeof onDone === "function" ? onDone() : null)} />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 md:p-8 z-[1]">
          <div className="w-full max-w-3xl mx-auto text-center">
            <PlanetScene element={active} index={step} total={ELEMENTS.length} label={active.staticLabel} />
            <div className="mt-6 text-lg md:text-xl opacity-90 min-h-[3rem]">
              <QuestionRotator items={active.whispers} periodMs={4000} />
            </div>
            <div className="mt-5">
              <ComboBoxMulti options={options} placeholder="Search or type your answer…" onSubmit={(vals)=>{
                if(!Array.isArray(vals) || vals.length===0) return;
                const next = step + 1;
                setAnswers({ ...answers, [active.key]: vals });
                if (next >= ELEMENTS.length) setPhase("bloom"); else setStep(next);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
