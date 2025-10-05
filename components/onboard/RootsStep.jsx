"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import OnboardCardLayout from "./OnboardCardLayout";
import ChautariLocationPicker from "../ChautariLocationPicker";

export default function RootsStep({ onNext, onBack, initialValue = null }) {
  const [supabase, setSupabase] = useState(null);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // ✅ Reuse global client or safely initialize
    if (!globalThis.supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        globalThis.supabase = createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
      } else {
        console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      }
    }
    setSupabase(globalThis.supabase || null);
  }, []);

  const canContinue = Boolean(value && supabase);

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Please sign in first.");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ roots_json: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      onNext?.();
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
          onClick={onBack}
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
        >
          ← Back
        </button>
        <div className="text-sm text-gray-400">2/3</div>
      </div>

      <h2 className="text-2xl md:text-3xl font-semibold text-white">
        Where do your roots touch the earth?
      </h2>
      <p className="text-gray-400 text-sm mb-4">
        Choose Nepal or Abroad. This anchors your presence in the Chautarī.
      </p>

      {supabase ? (
        <ChautariLocationPicker
          supabase={supabase}
          initialValue={initialValue}
          onChange={setValue}
        />
      ) : (
        <p className="text-gray-500 text-sm mt-4">Loading locations…</p>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-400 italic">
          Start above — we’ll build your path step by step.
        </div>
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className={`px-5 py-3 rounded-2xl ${
            canContinue
              ? "bg-yellow-500 hover:bg-yellow-400 text-black"
              : "bg-white/10 text-white/60"
          } font-semibold`}
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
