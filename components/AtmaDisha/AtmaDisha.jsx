"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CelestialBackground from "./CelestialBackground";
import PlanetScene from "./PlanetScene";
import QuestionRotator from "./QuestionRotator";
import ComboBoxMulti from "./ComboBoxMulti";
import IntroSky from "./IntroSky";
import AwakenedSky from "./AwakenedSky";
import { loadOptions, bundledOptions } from "@/lib/atmaOptions";

let supabase = null;
try { supabase = require("@/lib/supabaseClient").default ?? null; } catch (_) { supabase = null; }

const ELEMENTS = [
  { key: "occupation", id: "earth", planet: { name: "Earth", src: "/planet/earth.png", from: "bottom" }, staticLabel: "Your ROLE in SOCIETY", whispers: ["What work anchors your day?","What is your current role in society?","What's your present profession?"] },
  { key: "skill", id: "moon", planet: { name: "Moon", src: "/planet/moon.png", from: "left" }, staticLabel: "What you are GOOD AT", whispers: ["What do you do effortlessly?","Which skills flow with least resistance?","What do you excel at that helps others?"] },
  { key: "passion", id: "mars", planet: { name: "Mars", src: "/planet/mars.png", from: "top" }, staticLabel: "What you LOVE to do", whispers: ["What lights your inner flame?","What are you most excited to do daily?","Which activity brings radiant joy?"] },
  { key: "compassion", id: "saturn", planet: { name: "Saturn", src: "/planet/saturn.png", from: "right" }, staticLabel: "What WORLD NEEDS", whispers: ["What injustice steals your breath?","What lack in the world feels suffocating?","What change does your community need?"] },
  { key: "vision", id: "jupiter", planet: { name: "Jupiter", src: "/planet/jupiter.png", from: "depth" }, staticLabel: "Your VISION & GOALS", whispers: ["What vision guides you?","What future goal calls today?","What seeds are you planting?"] },
];

export default function AtmaDisha({ onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("intro"); // 'intro' -> 'orbs' -> 'bloom'
  const [lists, setLists] = useState(bundledOptions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ Safety timeout — auto-advance if IntroSky fails
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("orbs"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => { (async () => { setLists(await loadOptions(supabase)); })(); }, []);

  const active = ELEMENTS[step];
  const allDone = ELEMENTS.every(e => Array.isArray(answers[e.key]) && answers[e.key].length > 0);

  useEffect(() => {
    if (allDone && phase === "orbs") {
      const t = setTimeout(() => setPhase("bloom"), 400);
      return () => clearTimeout(t);
    }
  }, [allDone, phase]);

  async function persist(payload) {
    if (!supabase) return;
    try {
      setSaving(true); setError("");
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id;
      if (!uid) { setSaving(false); return; }
      const { error } = await supabase.from("profiles").update({ atmadisha_json: payload }).eq("user_id", uid);
      if (error) throw error;
    } catch {
      setError("We'll sync this to your profile shortly.");
    } finally { setSaving(false); }
  }

  const next = async (vals) => {
    if (!vals || vals.length === 0) return;
    setAnswers(prev => ({ ...prev, [active.key]: vals }));
    if (step < ELEMENTS.length - 1) setStep(step + 1);
  };

  const finish = async () => {
    await persist(answers);
    if (typeof onDone === "function") onDone();
  };

  const options = (lists[active.key] ?? []).length ? lists[active.key] : bundledOptions[active.key];

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      <CelestialBackground />
      <div className="absolute inset-0 grid place-items-center p-4 md:p-8">
        <AnimatePresence mode="wait">
          {phase === "intro" ? (
            <motion.div key="intro" className="w-full">
              <IntroSky onDone={() => setPhase("orbs")} />
            </motion.div>
          ) : phase === "orbs" ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-3xl mx-auto text-center"
            >
              <div className="sr-only">Step {step + 1} of 5</div>
              <PlanetScene element={active} index={step} total={ELEMENTS.length} label={active.staticLabel} />
              <div className="mt-6 text-lg md:text-xl opacity-90 min-h-[3rem]">
                <QuestionRotator items={active.whispers} periodMs={4000} />
              </div>
              <div className="mt-5">
                <ComboBoxMulti options={options} placeholder="Search or type your answer…" onSubmit={next} />
              </div>
              <div className="mt-4 text-emerald-300/80 text-sm h-5">
                {Array.isArray(answers[active.key]) && answers[active.key].length > 0 ? <span>Saved • {step + 1}/5</span> : null}
              </div>
            </motion.div>
          ) : (
            <motion.div key="bloom" className="w-full text-center">
              <AwakenedSky onContinue={finish} />
              <div className="mt-4 text-sm opacity-85">
                {saving ? "Syncing your Ātma Diśā…" : error ? error : ""}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}