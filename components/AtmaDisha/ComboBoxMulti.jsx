"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function ComboBoxMulti({ options = [], placeholder, onSubmit }){
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const v = value.trim().toLowerCase();
    if(!v) return options;
    return options.filter(o => o.toLowerCase().includes(v));
  }, [options, value]);

  useEffect(() => {
    const onClick = (e) => {
      if(ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const addCurrent = () => {
    const v = value.trim();
    if(!v) return;
    if(!selected.includes(v)) setSelected([...selected, v]);
    setValue("");
    setOpen(false);
  };

  const toggle = (opt) => {
    if(selected.includes(opt)){
      setSelected(selected.filter(x => x !== opt));
    }else{
      setSelected([...selected, opt]);
    }
  };

  const removeChip = (opt) => setSelected(selected.filter(x => x !== opt));

  const save = () => {
    if(selected.length === 0) addCurrent();
    const vals = selected.length ? selected : (value ? [value.trim()] : []);
    if(vals.length === 0) return;
    onSubmit(vals);
    setSelected([]);
    setValue("");
    setOpen(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto" ref={ref}>
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl px-3 py-3 md:px-4 md:py-4 backdrop-blur">
        <div className="flex gap-2 flex-wrap items-center">
          {selected.map(opt => (
            <span key={opt} className="px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center gap-1">
              {opt}
              <button className="opacity-70 hover:opacity-100" onClick={() => removeChip(opt)}>×</button>
            </span>
          ))}
          <input
            className="flex-1 bg-transparent outline-none px-3 py-2 rounded-xl border border-neutral-800 focus:border-neutral-600"
            placeholder={placeholder || "Search or type…"}
            value={value}
            onFocus={() => setOpen(true)}
            onChange={e => setValue(e.target.value)}
            onKeyDown={(e) => {
              if(e.key === "Enter"){ e.preventDefault(); addCurrent(); }
            }}
          />
          <button
            className="px-4 py-2 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-semibold"
            onClick={save}
          >
            Save
          </button>
        </div>
        {open && (
          <div className="relative">
            <div className="absolute z-20 mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm opacity-60">No matches. Press Enter to add your text as a chip.</div>
              ) : (
                <ul className="py-1">
                  {filtered.map((opt) => (
                    <li key={opt}>
                      <button
                        onClick={() => toggle(opt)}
                        className={"w-full text-left px-3 py-2 hover:bg-neutral-800 " + (selected.includes(opt) ? "bg-neutral-800" : "")}
                      >
                        {selected.includes(opt) ? "✓ " : ""}{opt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="mt-2 text-xs opacity-60">Tip: Type and press Enter to add, pick as many as you like, then Save.</div>
      </div>
    </div>
  );
}
