import { TinaMarkdown, type TinaMarkdownContent } from "tinacms/dist/rich-text";

import { type PostDocument } from "@/lib/content";
import { MDXContent } from "@/lib/mdx/server";

function renderNepaliBody(value: PostDocument["body_np"]) {
  if (!value) return null;
  if (typeof value === "string") {
    return <MDXContent source={value} />;
  }
  return <TinaMarkdown content={value as TinaMarkdownContent} />;
}

export function ArticleView({ post }: { post: PostDocument }) {
  return (
    <article className="max-w-3xl mx-auto px-6 pt-16">
      <h1 className="text-2xl sm:text-4xl font-bold text-amber-300">{post.title}</h1>
      {post.title_np && (
        <p className="mt-2 text-lg text-amber-200/80 font-medium">{post.title_np}</p>
      )}
      {post.excerpt && <p className="mt-3 text-slate-400">{post.excerpt}</p>}
      {post.cover && (
        <img
          src={post.cover}
          alt={post.title}
          className="mt-6 w-full rounded-2xl border border-white/10"
        />
      )}
      <div className="mt-8 prose prose-invert prose-amber max-w-none">
        <MDXContent source={post.body} />
      </div>
      {post.body_np && (
        <section className="mt-16 border-t border-white/10 pt-8">
          <h2 className="text-xl font-semibold text-amber-300">🇳🇵 Nepali Edition</h2>
          <div className="mt-4 prose prose-invert prose-amber max-w-none">
            {renderNepaliBody(post.body_np)}
          </div>
        </section>
      )}
    </article>
  );
}
