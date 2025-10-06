"use client";

import { useState } from "react";

export function ReactionBar({ slug }: { slug: string }) {
  const [count, setCount] = useState(0);
  return (
    <div className="mt-8 mb-2 flex gap-3 text-slate-300">
      <button onClick={()=>setCount(c=>c+1)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-1 hover:scale-[1.02] transition">🔥 {count}</button>
      <span className="text-slate-500 text-sm">Reactions are optimistic (demo). Wire to Supabase RPC later.</span>
    </div>
  );
}
