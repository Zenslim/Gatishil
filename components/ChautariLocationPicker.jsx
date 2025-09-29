"use client";

/**
 * Gatishil • ChautariLocationPicker
 * ELI15: One box to type "Kath…" or "Dubai", a toggle for "I live abroad".
 * It searches your Supabase function geo.search_locations and returns
 * either a Nepal Ward (with Local Level + District + Province label)
 * or a Diaspora City (City, State (Country)).
 *
 * Plug-in:
 *   <ChautariLocationPicker
 *      value={value}
 *      onChange={(v) => setForm({ ...form, roots: v?.label, diaspora: v?.type === 'city' ? v?.label : '' })}
 *   />
 *
 * Env (Vercel → Settings → Environment Variables):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ChautariLocationPicker({ value = null, onChange }) {
  const [query, setQuery] = useState("");
  const [abroad, setAbroad] = useState(false);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);
  const debouncedQ = useDebounce(query, 200);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search Supabase RPC geo.search_locations(q, k)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedQ || debouncedQ.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("search_locations", {
          q: debouncedQ,
          k: 20,
        });
        if (error) throw error;

        // filter by toggle
        const filtered = (data || []).filter((r) =>
          abroad ? r.type === "city" : r.type === "ward"
        );
        if (!cancelled) setResults(filtered);
      } catch (e) {
        console.error("search_locations error", e);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, abroad]);

  const placeholder = abroad
    ? "Type your city (e.g., Dubai, Boston)…"
    : "Type ward/local level (e.g., Ward 5 Kathmandu)…";

  const selectedLabel = value?.label ?? "";

  return (
    <div ref={boxRef} className="w-full">
      {/* Toggle */}
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm text-slate-300">I live abroad</label>
        <button
          type="button"
          onClick={() => {
            setAbroad((v) => !v);
            setQuery("");
            setResults([]);
            setOpen(false);
            // clear selection when switching mode
            onChange?.(null);
          }}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            abroad ? "bg-amber-400" : "bg-white/10"
          }`}
          aria-pressed={abroad}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              abroad ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={open ? query : selectedLabel || query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/20 bg-black/30 p-3 text-white placeholder-slate-400 focus:outline-none"
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {/* Spinner */}
        {loading && (
          <div className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}

        {/* Dropdown */}
        {open && (results.length > 0 || (debouncedQ && !loading)) && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/10 bg-black/90 p-1 shadow-xl backdrop-blur">
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">
                No matches yet. Try another spelling.
              </li>
            )}
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    const payload = normalizeSelection(r);
                    onChange?.(payload);
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-slate-400">
        {abroad
          ? "Search your city and country. Example: 'Sydney', 'Dubai'."
          : "Search by ‘Ward X’, local level, or district. Example: 'Ward 5 Kathmandu'."}
      </p>
    </div>
  );
}

function normalizeSelection(r) {
  if (r.type === "ward") {
    // Keep enough info for saving to profile
    return {
      type: "ward",
      id: r.id, // ward_id
      label: r.label, // "Ward 5 — Kathmandu Metropolitan City, Kathmandu, Bagmati"
      province_id: r.province_id,
      district_id: r.district_id,
      local_level_id: r.local_level_id,
      ward_no: r.ward_no,
    };
  }
  // city
  return {
    type: "city",
    id: r.id, // city_id
    label: r.label, // "City, State (Country)"
    country_code: r.country_code,
    city_id: r.city_id,
  };
}

/** Debounce hook */
function useDebounce(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
