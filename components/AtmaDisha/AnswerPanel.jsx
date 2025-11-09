"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function AnswerPanel({ options = [], placeholder, onSubmit }){
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if(!value) return options;
    return options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  }, [options, value]);

  useEffect(() => {
    if(open && listRef.current){
      const el = listRef.current.querySelector("[data-first]");
      if(el) el.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

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
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <button
              type="button"
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition"
              onClick={() => setOpen(v => !v)}
            >
              {open ? "Hide list ▴" : "Choose from list ▾"}
            </button>
            {open && (
              <div className="absolute z-20 mt-2 w-[260px] bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl max-h-64 overflow-y-auto" ref={listRef}>
                <ul className="py-1">
                  {filtered.map((opt, i) => (
                    <li key={opt}>
                      <button
                        data-first={i===0?true:undefined}
                        onClick={() => { setValue(opt === "Other" ? "" : opt); if(opt !== "Other") onSubmit(opt); }}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-800"
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

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
        <div className="mt-2 text-xs opacity-60">Tip: You can pick a suggestion or type your own truth.</div>
      </div>
    </div>
  );
}
