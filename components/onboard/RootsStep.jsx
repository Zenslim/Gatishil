"use client";
import { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import OnboardCardLayout from "./OnboardCardLayout";
import ChautariLocationPicker from "../ChautariLocationPicker";

/**
 * Unified RootsStep — same logic, unified visuals
 */
export default function RootsStep({ supabase: supabaseProp, onNext, initialValue = null, onBack }) {
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    if (supabaseProp) {
      supabaseRef.current = supabaseProp;
    } else if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
  }
  const supabase = supabaseRef.current;

  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canContinue = Boolean(value);

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase client unavailable");
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Please sign in first.");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ roots_json: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      if (typeof onNext === "function") onNext();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to save roots");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardCardLayout>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
          onClick={() => (typeof onBack === "function" ? onBack() : null)}
        >
          ← Back
        </button>
        <div className="text-sm text-gray-400">2/3</div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-white">
          Where do your roots touch the earth?
        </h2>
        <p className="text-gray-400 text-sm">
          Choose Nepal or Abroad. This anchors your presence in the Chautari.
        </p>
      </div>

      <ChautariLocationPicker
        supabase={supabase}
        initialValue={initialValue}
        onChange={setValue}
      />

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-400 italic">
          Start above — we’ll build your path step by step.
        </div>
        <button
          type="button"
          className={`px-5 py-3 rounded-2xl ${canContinue ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-white/10 text-white/60"} font-semibold`}
          onClick={handleContinue}
          disabled={!canContinue || saving}
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Shared trust grows when every voice has verified roots.
      </p>
    </OnboardCardLayout>
  );
}
