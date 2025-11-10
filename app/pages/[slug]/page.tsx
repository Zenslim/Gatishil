import { Metadata } from "next";
import { notFound } from "next/navigation";

import { MDXContent } from "@/lib/mdx/server";
import {
  getPageBySlug,
  listPageSlugs,
  type PageDocument,
} from "@/lib/content";
import { TinaMarkdown, type TinaMarkdownContent } from "tinacms/dist/rich-text";

function renderNepaliBody(value: PageDocument["body_np"]) {
  if (!value) return null;
  if (typeof value === "string") {
    return <MDXContent source={value} />;
  }
  return <TinaMarkdown content={value as TinaMarkdownContent} />;
}

export async function generateStaticParams() {
  const slugs = await listPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

async function loadPage(slug: string): Promise<PageDocument | null> {
  return getPageBySlug(slug);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: page.excerpt ?? page.body.slice(0, 120) || "Gatishil Page",
  };
}

export default async function PageRoute({ params }: { params: { slug: string } }) {
  const page = await loadPage(params.slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-[#0B0C10] text-slate-200">
      <article className="max-w-3xl mx-auto px-6 pt-16">
        <h1 className="text-3xl font-semibold text-amber-300">{page.title}</h1>
        {page.title_np && <p className="mt-2 text-amber-200/80">{page.title_np}</p>}
        <div className="mt-8 prose prose-invert prose-amber max-w-none">
          <MDXContent source={page.body} />
        </div>
        {page.body_np && (
          <section className="mt-16 border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold text-amber-300">🇳🇵 Nepali Edition</h2>
            <div className="mt-4 prose prose-invert prose-amber max-w-none">
              {renderNepaliBody(page.body_np)}
            </div>
          </section>
        )}
      </article>
      <div className="h-24" />
    </main>
  );
}
