"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CelestialBackground from "./CelestialBackground";
import OrbScene from "./OrbScene";
import ComboBox from "./ComboBox";
import PlanetBloom from "./PlanetBloom";

let supabase = null;
try { supabase = require("@/lib/supabaseClient").default ?? null; } catch (_) { supabase = null; }

const ELEMENTS = [
  { key: "occupation", id: "earth", label: "✋ Prithvi (Earth)", color: "#FBBF24",
    whispers: ["What work anchors your day?","What is your current role in society?","What’s your present profession?"],
    options: ["Farmer","Teacher","Student","Craftsperson","Engineer","Healer","Merchant","Homemaker","Driver","Laborer","Nurse","Doctor","Software Engineer","Designer","Artist","Musician","Police","Army","Civil Servant","Entrepreneur","Volunteer","Unemployed","Other"]
  },
  { key: "skill", id: "water", label: "🎁 Jal (Water)", color: "#67E8F9",
    whispers: ["What do you do effortlessly?","Which skills flow with least resistance?","What do you excel at that helps others?"],
    options: ["Listening","Teaching","Organizing","Design","Coding","Cooking","Negotiation","Caretaking","Writing","Public Speaking","Photography","Carpentry","Farming","Healing","Finance","Sales","Research","Strategy","Community Building","Other"]
  },
  { key: "passion", id: "fire", label: "🔥 Agni (Fire)", color: "#FB923C",
    whispers: ["What lights your inner flame?","What are you most excited to do daily?","Which activity brings radiant joy?"],
    options: ["Storytelling","Building","Gardening","Art","Music","Research","Entrepreneurship","Volunteering","Meditation","Teaching","Coding Projects","Sports & Movement","Reading","Travel","Other"]
  },
  { key: "compassion", id: "air", label: "❤️ Vayu (Air)", color: "#F472B6",
    whispers: ["What injustice steals your breath?","What lack in the world feels suffocating?","What change does your community need?"],
    options: ["Children","Elders","Climate","Health Access","Corruption","Education","Poverty","Women Safety","Animal Care","Disability Inclusion","Mental Health","Rural Access","Clean Water","Other"]
  },
  { key: "vision", id: "space", label: "🌱 Akash (Space)", color: "#C084FC",
    whispers: ["What vision guides you?","What future goal calls today?","What seeds are you planting?"],
    options: ["Village Learning Hub","Clean Water for All","Cooperative Farm","Open Health Center","Ethical Business","Art Collective","Research Lab","Forest Restoration","Makerspace","Community Kitchen","Youth Club","Other"]
  },
];

export default function AtmaDisha({ onDone }){
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("orbs"); // "orbs" | "bloom"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const active = ELEMENTS[step];
  const allDone = ELEMENTS.every(e => !!answers[e.key]);

  useEffect(() => {
    if(allDone && phase==="orbs"){
      const t = setTimeout(() => setPhase("bloom"), 400);
      return () => clearTimeout(t);
    }
  }, [allDone, phase]);

  async function persistToSupabase(payload){
    if(!supabase) return;
    try{
      setSaving(true); setError("");
      const { data: user } = await supabase.auth.getUser();
      const user_id = user?.user?.id;
      if(!user_id){ setSaving(false); return; }
      const { error } = await supabase.from("profiles").update({ atmadisha_json: payload }).eq("user_id", user_id);
      if(error) throw error;
    }catch(err){
      setError("We’ll sync this to your profile shortly.");
    }finally{ setSaving(false); }
  }

  const next = async (val) => {
    if(!val) return;
    setAnswers(prev => ({ ...prev, [active.key]: val }));
    if(step < ELEMENTS.length - 1) setStep(step + 1);
  };

  const finish = async () => {
    await persistToSupabase(answers);
    if(typeof onDone === "function") onDone();
  };

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      <CelestialBackground />
      <div className="absolute inset-0 grid place-items-center p-4 md:p-8">
        <AnimatePresence mode="wait">
          {phase === "orbs" ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-3xl mx-auto text-center"
            >
              <OrbScene element={active} index={step} total={ELEMENTS.length} whispers={active.whispers} />
              <div className="mt-5">
                <ComboBox
                  options={active.options}
                  placeholder="Search or type your answer…"
                  onSubmit={next}
                />
              </div>
              <div className="mt-4 text-emerald-300/80 text-sm h-5">
                {!!answers[active.key] && <span>Saved • {step+1}/5</span>}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bloom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-4xl mx-auto text-center"
            >
              <PlanetBloom answers={answers} onComplete={finish} />
              <div className="mt-4 text-sm opacity-85">
                {saving ? "Syncing your Ātma Diśā…" : error ? error : "Breathe… your direction is clear."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
