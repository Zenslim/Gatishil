"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function ComboBox({ options = [], placeholder, onSubmit }){
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if(!value) return options;
    return options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  }, [options, value]);

  useEffect(() => {
    const onClick = (e) => {
      if(ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const commit = (v) => {
    const val = (v ?? value).trim();
    if(!val) return;
    onSubmit(val);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto" ref={ref}>
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl px-3 py-3 md:px-4 md:py-4 backdrop-blur">
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 bg-transparent outline-none px-3 py-2 rounded-xl border border-neutral-800 focus:border-neutral-600"
            placeholder={placeholder || "Search or type…"}
            value={value}
            onFocus={() => setOpen(true)}
            onChange={e => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" ? commit() : null}
          />
          <button
            className="px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold"
            onClick={() => commit()}
          >
            Save →
          </button>
        </div>
        {open && (
          <div className="relative">
            <div className="absolute z-20 mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm opacity-60">No matches. Press Enter to use your text.</div>
              ) : (
                <ul className="py-1">
                  {filtered.map((opt) => (
                    <li key={opt}>
                      <button
                        onClick={() => commit(opt)}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-800"
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="mt-2 text-xs opacity-60">Tip: Start typing to search, or press Enter to save your own words.</div>
      </div>
    </div>
  );
}
