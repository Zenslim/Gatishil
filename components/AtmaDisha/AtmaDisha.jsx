"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroSky from "../IntroSky";        // components/IntroSky.jsx (relative from /components/AtmaDisha)
import AwakenedSky from "../AwakenedSky";  // components/AwakenedSky.jsx
import { loadOptions, bundledOptions } from "@/lib/atmaOptions";

let supabase = null;
try { supabase = require("@/lib/supabaseClient").default ?? null; } catch (_) { supabase = null; }

/** ----- Local lightweight visuals and inputs ----- */

// Starry background (no external deps)
function StarField() {
  const stars = useMemo(() => Array.from({ length: 140 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 2 + 0.5,
    o: Math.random() * 0.7 + 0.2,
  })), []);
  return (
    <div className="absolute inset-0 -z-10 bg-black">
      <div className="absolute inset-0" style={{background:"radial-gradient(1200px 600px at 50% 110%, rgba(16,185,129,0.10), transparent 60%)"}} />
      {stars.map((st, i) => (
        <div key={i}
          className="absolute rounded-full"
          style={{
            left: `${st.x}vw`, top: `${st.y}vh`,
            width: st.s, height: st.s, opacity: st.o,
            background: "white", boxShadow: "0 0 8px rgba(255,255,255,0.6)"
          }}
        />
      ))}
    </div>
  );
}

// Local QuestionRotator
function LocalQuestionRotator({ items = [], periodMs = 4000 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setI(v => (v + 1) % items.length), periodMs);
    return () => clearInterval(t);
  }, [items, periodMs]);
  if (!items.length) return null;
  return (
    <motion.div key={i}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
      className="text-lg md:text-xl opacity-90"
    >
      {items[i]}
    </motion.div>
  );
}

// Local ComboBoxMulti: enter text, press Enter to add; shows chips; Submit button
function LocalComboBoxMulti({ options = [], placeholder, onSubmit }) {
  const [val, setVal] = useState("");
  const [chips, setChips] = useState([]);
  const normalized = useMemo(() => options?.map(o => (typeof o === "string" ? o : o?.label ?? "")), [options]);

  function addChip(text) {
    const t = (text || "").trim();
    if (!t) return;
    if (!chips.includes(t)) setChips(prev => [...prev, t]);
  }
  function removeChip(t) { setChips(prev => prev.filter(x => x !== t)); }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-3 justify-center">
        {chips.map(c => (
          <span key={c} className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            {c}
            <button className="ml-2 text-emerald-200/80" onClick={() => removeChip(c)}>×</button>
          </span>
        ))}
      </div>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addChip(val);
            setVal("");
          }
        }}
        list="atma-hints"
        placeholder={placeholder || "Search or type your answer…"}
        className="w-full max-w-xl mx-auto px-4 py-3 rounded-lg bg-white/5 border border-white/15 outline-none focus:ring-2 focus:ring-emerald-400/40"
      />
      <datalist id="atma-hints">
        {normalized.slice(0, 50).map((o, idx) => <option key={idx} value={o} />)}
      </datalist>
      <div className="mt-3 text-center">
        <button
          onClick={() => chips.length ? onSubmit?.(chips) : null}
          className="px-4 py-2 rounded-md bg-emerald-400 text-black font-semibold shadow"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

/** ----- Flow data ----- */
const ELEMENTS = [
  { key: "occupation", id: "earth",   staticLabel: "Your ROLE in SOCIETY", whispers: ["What work anchors your day?","What is your current role in society?","What’s your present profession?"] },
  { key: "skill",      id: "moon",    staticLabel: "What you are GOOD AT", whispers: ["What do you do effortlessly?","Which skills flow with least resistance?","What do you excel at that helps others?"] },
  { key: "passion",    id: "mars",    staticLabel: "What you LOVE to do", whispers: ["What lights your inner flame?","What are you most excited to do daily?","Which activity brings radiant joy?"] },
  { key: "compassion", id: "saturn",  staticLabel: "What WORLD NEEDS",    whispers: ["What injustice steals your breath?","What lack in the world feels suffocating?","What change does your community need?"] },
  { key: "vision",     id: "jupiter", staticLabel: "Your VISION & GOALS",  whispers: ["What vision guides you?","What future goal calls today?","What seeds are you planting?"] },
];

/** ----- Main component ----- */
export default function AtmaDisha({ onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("intro"); // intro -> orbs -> bloom
  const [lists, setLists] = useState(bundledOptions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Safety: advance from intro even if anything hiccups
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("orbs"), 2600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Load dynamic options from Supabase if available
  useEffect(() => { (async () => { setLists(await loadOptions(supabase)); })(); }, []);

  const active = ELEMENTS[step];
  const allDone = ELEMENTS.every(e => Array.isArray(answers[e.key]) && answers[e.key].length > 0);

  useEffect(() => {
    if (allDone && phase === "orbs") {
      const t = setTimeout(() => setPhase("bloom"), 450);
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
      const { error } = await supabase.from("profiles")
        .update({ atmadisha_json: payload })
        .eq("user_id", uid);
      if (error) throw error;
    } catch {
      setError("We’ll sync this to your profile shortly.");
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
      <StarField />

      {/* Intro layer */}
      <div className={phase === "intro" ? "absolute inset-0 z-[10]" : "hidden"}>
        <IntroSky onDone={() => setPhase("orbs")} />
      </div>

      {/* Orbs + questions layer */}
      <div className={phase !== "bloom" ? "absolute inset-0 z-[20] grid place-items-center p-4 md:p-8" : "hidden"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${active?.id}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-3xl mx-auto text-center"
          >
            <div className="text-sm text-white/70 mb-2">Step {step + 1} of {ELEMENTS.length} • {active?.staticLabel}</div>

            {/* (Planet visuals were removed for reliability) */}

            <div className="mt-2 min-h-[3rem]">
              <LocalQuestionRotator items={active?.whispers ?? []} periodMs={4000} />
            </div>

            <div className="mt-5">
              <LocalComboBoxMulti options={options} placeholder="Search or type your answer…" onSubmit={next} />
            </div>

            <div className="mt-4 text-emerald-300/80 text-sm h-5">
              {Array.isArray(answers[active.key]) && answers[active.key].length > 0 ? <span>Saved • {step + 1}/{ELEMENTS.length}</span> : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Finale */}
      <div className={phase === "bloom" ? "absolute inset-0 z-[30] grid place-items-center p-4 md:p-8" : "hidden"}>
        <AwakenedSky onContinue={finish} />
        <div className="mt-4 text-sm opacity-85 text-center">
          {saving ? "Syncing your Ātma Diśā…" : error ? error : ""}
        </div>
      </div>

      {/* Tiny HUD for debugging */}
      <div className="fixed bottom-2 left-2 text-xs text-white/70 z-[50] pointer-events-none">
        phase: {phase} • step: {step + 1}/{ELEMENTS.length}
      </div>
    </div>
  );
}
