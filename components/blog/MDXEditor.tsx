"use client";

import { useEffect } from "react";

export default function MDXEditor({ value, onChange }: { value: string; onChange: (v: string)=>void }) {
  useEffect(()=>{
    // Auto-save to local storage (demo)
    const key = "gatishil_mdx_draft";
    const saved = localStorage.getItem(key);
    if (saved && !value) onChange(saved);
    const id = setInterval(()=> localStorage.setItem(key, value), 10000);
    return ()=> clearInterval(id);
  }, [value, onChange]);

  return (
    <textarea
      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 min-h-[420px] outline-none focus:ring-2 focus:ring-amber-400"
      placeholder="# Title\n\nWrite in Markdown/MDX…"
      value={value}
      onChange={e=>onChange(e.target.value)}
    />
  );
}
