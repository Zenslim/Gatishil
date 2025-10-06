import { MarkdownRenderer } from "@/lib/mdxRenderer";

export function ArticleView({ post }: { post: any }) {
  return (
    <article className="max-w-3xl mx-auto px-6 pt-16">
      <h1 className="text-2xl sm:text-4xl font-bold text-amber-300">{post.title}</h1>
      {post.excerpt && <p className="mt-2 text-slate-400">{post.excerpt}</p>}
      <div className="mt-8 prose prose-invert prose-amber max-w-none">
        <MarkdownRenderer content={post.content_mdx ?? ""} />
      </div>
    </article>
  );
}
