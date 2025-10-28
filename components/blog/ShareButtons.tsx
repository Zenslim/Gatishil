"use client";

import { useEffect, useState } from "react";
import { Share2, Twitter, Linkedin, Link as LinkIcon, MessageCircle } from "lucide-react";

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) {
    return null;
  }

  const url = `${origin}/blog/${slug}`;
  const shareText = `${title} — Gatishil Blog`;

  const tryNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: shareText, url });
        return true;
      } catch { /* ignore */ }
    }
    return false;
  };

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  return (
    <div className="mt-10 mb-6 flex items-center gap-4 text-slate-400">
      <span className="text-sm flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</span>
      <button className="hover:text-amber-400" onClick={async ()=>{
        const used = await tryNative();
        if (!used) open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`);
      }}><Twitter className="w-5 h-5" /></button>
      <button className="hover:text-amber-400" onClick={()=>open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}><Linkedin className="w-5 h-5" /></button>
      <button className="hover:text-amber-400" onClick={()=>open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + url)}`)}><MessageCircle className="w-5 h-5" /></button>
      <button className="hover:text-amber-400" onClick={()=>{
        navigator.clipboard?.writeText(url);
        alert("Link copied");
      }}><LinkIcon className="w-5 h-5" /></button>
    </div>
  );
}
