"use client";

import { useState } from "react";
import { sealAndComment } from "@/lib/blogApi";

export function CommentDrawer({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <p className="text-slate-400 text-sm">🌿 Every voice leaves a trace under this sky.</p>
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder="Add your reflection…"
        className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400 min-h-[100px]"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={async ()=>{
            const res = await sealAndComment({ post_id: postId, text });
            setOk(res);
            if (res) setText("");
          }}
          className="rounded-2xl bg-amber-400/90 hover:bg-amber-400 text-black px-5 py-2 font-medium"
        >
          Seal & Send 🔐
        </button>
      </div>
      {ok === true && <div className="mt-2 text-amber-300 text-sm">Your reflection is sealed.</div>}
      {ok === false && <div className="mt-2 text-red-300 text-sm">Failed to post. Check console.</div>}
    </div>
  );
}
