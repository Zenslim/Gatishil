"use client";
import React, { useState } from "react";

export default function AnswerPanel({ options = [], placeholder, onSubmit }){
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const commit = () => {
    const v = (value || "").trim();
    if(!v) return;
    onSubmit(v);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 md:p-4 backdrop-blur">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition"
            onClick={() => setOpen(!open)}
          >
            Choose from list ▾
          </button>
          <input
            className="flex-1 bg-transparent outline-none px-3 py-2 rounded-xl border border-neutral-800 focus:border-neutral-600"
            placeholder={placeholder || "Type your answer…"}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" ? commit() : null}
          />
          <button
            className="px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold"
            onClick={commit}
          >
            Save →
          </button>
        </div>
        {open && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { setValue(opt === "Other" ? "" : opt); if(opt !== "Other") onSubmit(opt); }}
                className="text-left px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 text-xs opacity-60">Tip: You can pick a suggestion or type your own truth.</div>
      </div>
    </div>
  );
}
