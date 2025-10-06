import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "🪶 The Living Ledger of Thought — Blog",
  description: "Every reflection under one sky.",
};

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[] | null;
  created_at: string;
  author_name?: string | null;
};

async function getPosts(): Promise<Post[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !key) {
    // Fallback demo content if env is missing
    return [
      { id: "demo-1", title: "The Spark that Moves", slug: "the-spark-that-moves", excerpt: "On motion, courage, and quiet revolutions.", tags: ["Essays"], created_at: new Date().toISOString(), author_name: "Gatishil" },
      { id: "demo-2", title: "Economy as Ecology", slug: "economy-as-ecology", excerpt: "Designing value like watersheds, not pipelines.", tags: ["Economy","Ecology"], created_at: new Date().toISOString(), author_name: "Gatishil" },
      { id: "demo-3", title: "Every Voice Sings", slug: "every-voice-sings", excerpt: "A DAO is a choir with a purpose.", tags: ["Governance"], created_at: new Date().toISOString(), author_name: "Gatishil" },
    ];
  }
  const res = await fetch(`${url}/rest/v1/posts?select=id,title,slug,excerpt,tags,created_at,author_name&order=created_at.desc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    // Revalidate every 60s
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error("Failed to fetch posts", await res.text());
    return [];
  }
  return res.json();
}

export default async function BlogIndexPage() {
  const posts = await getPosts();
  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <section className="py-16 text-center px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-amber-400">🪶 The Living Ledger of Thought</h1>
        <p className="text-slate-400 mt-2">Every reflection under one sky.</p>
      </section>

      <section className="grid gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3 pb-16">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:shadow-lg hover:shadow-amber-400/10 transition">
            <h3 className="text-lg font-semibold group-hover:text-amber-300 transition">{p.title}</h3>
            {p.excerpt && <p className="mt-2 text-slate-300/85 text-sm line-clamp-2">{p.excerpt}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              {(p.tags || []).map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 bg-white/5">{t}</span>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">{p.author_name ?? "Member"} • {new Date(p.created_at).toLocaleDateString()}</div>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-slate-400 col-span-full">No posts yet.</div>
        )}
      </section>
    </main>
  );
}
