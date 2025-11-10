import { Metadata } from "next";
import Link from "next/link";

import { getPostsIndex } from "@/lib/content";

export const metadata: Metadata = {
  title: "🪶 The Living Ledger of Thought — Blog",
  description: "Every reflection under one sky.",
};

export default async function BlogIndexPage() {
  const posts = await getPostsIndex();
  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <section className="py-16 text-center px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-amber-400">🪶 The Living Ledger of Thought</h1>
        <p className="text-slate-400 mt-2">Every reflection under one sky.</p>
      </section>

      <section className="grid gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3 pb-16">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:shadow-lg hover:shadow-amber-400/10 transition"
          >
            <h3 className="text-lg font-semibold group-hover:text-amber-300 transition">{p.title}</h3>
            {p.title_np && (
              <p className="mt-1 text-sm text-amber-200/80">{p.title_np}</p>
            )}
            {p.excerpt && <p className="mt-2 text-slate-300/85 text-sm line-clamp-2">{p.excerpt}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              {(p.tags || []).map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 bg-white/5">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              {p.author ?? "Gatishil"} • {new Date(p.date).toLocaleDateString()}
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-slate-400 col-span-full">No posts yet.</div>
        )}
      </section>
    </main>
  );
}
