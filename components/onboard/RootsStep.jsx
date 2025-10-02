"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ChautariLocationPicker from "../ChautariLocationPicker";

/**
 * RootsStep.jsx — Self-sufficient
 * - Auto-creates a Supabase browser client if none provided
 * - Avoids calling `supabase.auth` when client is undefined
 */
export default function RootsStep({ supabase: supabaseProp, onNext, initialValue = null }) {
  const router = useRouter();
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

  const [value, setValue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canContinue = Boolean(value);

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase client unavailable");
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Please sign in first.");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ roots_json: value })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      if (onNext) onNext();
      else router.push("/onboarding?step=3");
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to save roots");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          onClick={() => router.back()}
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

      <p className="text-xs text-neutral-500 mt-3">
        Shared trust grows when every voice has verified roots.
      </p>
    </div>
  );
}
