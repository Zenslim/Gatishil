import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/blog/ArticleView";
import { ReactionBar } from "@/components/blog/ReactionBar";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { CommentDrawer } from "@/components/blog/CommentDrawer";
import {
  getPostBySlug,
  listPostSlugs,
  type PostDocument,
} from "@/lib/content";

export async function generateStaticParams() {
  const slugs = await listPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

async function loadPost(slug: string): Promise<PostDocument | null> {
  return getPostBySlug(slug);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await loadPost(params.slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? "Gatishil Blog",
    openGraph: {
      title: post.title,
      description: post.excerpt ?? "",
      url: `/blog/${post.slug}`,
      type: "article",
      images: post.cover ? [post.cover] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? "",
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await loadPost(params.slug);
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
