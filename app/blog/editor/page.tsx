"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/unifiedClient";
import { sealAndPublish } from "@/lib/blogApi";
import { EditorLayout } from "@/components/blog/EditorLayout";
const MDXEditor = dynamic(() => import("@/components/blog/MDXEditor"), { ssr: false });
const PreviewPane = dynamic(() => import("@/components/blog/PreviewPane"), { ssr: false });

export default function EditorPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string>("");

  // Redirect if not signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        alert("Please sign in to publish.");
        window.location.href = "/join";
      }
    });
  }, []);

  useEffect(() => {
    const s = title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    setSlug(s);
  }, [title]);

  return (
    <EditorLayout>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Post title" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400" />
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="slug" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2" />
          <input value={excerpt} onChange={e=>setExcerpt(e.target.value)} placeholder="One-line excerpt" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 md:col-span-2" />
          <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags (comma separated)" className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 md:col-span-2" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <MDXEditor value={content} onChange={setContent} />
          <PreviewPane content={content} />
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">Save Draft</button>
          <button
            className="rounded-2xl bg-amber-400/90 hover:bg-amber-400 text-black px-5 py-2 font-medium"
            onClick={async ()=>{
              const ok = await sealAndPublish({ title, slug, excerpt, content_mdx: content, tags: tags.split(",").map(t=>t.trim()).filter(Boolean) });
              if (ok) router.push(`/blog/${slug}`);
            }}
          >
            Seal & Publish 🔐
          </button>
        </div>
      </div>
    </EditorLayout>
  );
}
