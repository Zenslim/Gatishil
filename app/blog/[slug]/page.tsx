import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ArticleView } from "@/components/blog/ArticleView";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ReactionBar } from "@/components/blog/ReactionBar";
import { CommentDrawer } from "@/components/blog/CommentDrawer";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_mdx: string | null;
  tags: string[] | null;
  created_at: string;
  author_name?: string | null;
};

async function getPost(slug: string): Promise<Post | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!url || !key) {
    // Demo fallback for local viewing
    if (slug === "the-spark-that-moves") {
      return {
        id: "demo-1",
        title: "The Spark that Moves",
        slug,
        excerpt: "On motion, courage, and quiet revolutions.",
        content_mdx: "# The Spark that Moves\n\nWe move so the world may breathe.",
        tags: ["Essays"],
        created_at: "2024-01-10T00:00:00.000Z",
        author_name: "Gatishil"
      };
    }
    return null;
  }

  const res = await fetch(`${url}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const arr = await res.json();
  return arr[0] ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? "Gatishil Blog",
    openGraph: {
      title: post.title,
      description: post.excerpt ?? "",
      url: `/blog/${post.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? "",
    },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <ArticleView post={post} />
      <div className="max-w-3xl mx-auto px-6">
        <ReactionBar slug={post.slug} />
        <ShareButtons title={post.title} slug={post.slug} />
        <CommentDrawer postId={post.id} />
      </div>
      <div className="h-24" />
    </main>
  );
}
