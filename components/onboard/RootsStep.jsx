"use client";
import { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ChautariLocationPicker from "../ChautariLocationPicker";

/**
 * components/onboard/RootsStep.jsx — Self-sufficient step screen
 * - Creates a Supabase browser client if none is provided
 * - Saves to `profiles.roots_json`
 * - Calls onNext() after successful save; no internal routing here
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
      console.info("[RootsStep] Using internal Supabase client.");
    } else {
      console.warn("[RootsStep] No Supabase client available.");
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
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-100">
          Where do your roots touch the earth?
        </h2>
        <p className="text-neutral-400 text-sm">
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
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          onClick={() => (typeof onBack === "function" ? onBack() : null)}
        >
          Back
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg ${canContinue ? "bg-indigo-600 hover:bg-indigo-500" : "bg-neutral-700 opacity-60"} text-white`}
          onClick={handleContinue}
          disabled={!canContinue || saving}
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Shared trust grows when every voice has verified roots.
      </p>
    </div>
  );
}
