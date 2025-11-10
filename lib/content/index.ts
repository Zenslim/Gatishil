import "server-only";

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";

import { logMissingTranslation } from "@/lib/i18n/logMissing";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const POSTS_DIR = path.join(CONTENT_ROOT, "posts");
const PAGES_DIR = path.join(CONTENT_ROOT, "pages");
const VALID_EXTENSIONS = new Set([".md", ".mdx"]);

export type TinaRichText = unknown;

export interface PostDocument {
  id: string;
  title: string;
  title_np?: string;
  slug: string;
  date: string;
  cover?: string;
  tags: string[];
  excerpt?: string;
  author?: string;
  body: string;
  body_np?: TinaRichText;
}

export interface PostSummary extends Omit<PostDocument, "body" | "body_np"> {}

export interface PageDocument {
  id: string;
  title: string;
  title_np?: string;
  slug: string;
  date?: string;
  cover?: string;
  body: string;
  body_np?: TinaRichText;
  excerpt?: string;
}

export interface PageSummary extends Omit<PageDocument, "body" | "body_np"> {}

async function walkFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return walkFiles(fullPath);
        }
        if (entry.isFile() && VALID_EXTENSIONS.has(path.extname(entry.name))) {
          return [fullPath];
        }
        return [] as string[];
      })
    );
    return files.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

interface RawDocument {
  filePath: string;
  data: Record<string, unknown>;
  content: string;
}

async function readMdxFile(filePath: string): Promise<RawDocument> {
  const source = await fs.readFile(filePath, "utf-8");
  const parsed = matter(source);
  return { filePath, data: parsed.data, content: parsed.content.trim() };
}

function deriveSlug(raw: RawDocument): string {
  const explicit = raw.data.slug;
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim();
  }
  const base = path.basename(raw.filePath, path.extname(raw.filePath));
  return base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string" && value.trim()) return new Date(value).toISOString();
  return new Date().toISOString();
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function buildExcerpt(preferred: unknown, fallback: string): string | undefined {
  if (typeof preferred === "string" && preferred.trim()) {
    return preferred.trim();
  }
  const normalized = fallback.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > 240 ? `${normalized.slice(0, 237)}…` : normalized;
}

function normalisePost(raw: RawDocument): PostDocument {
  const slug = deriveSlug(raw);
  const title = typeof raw.data.title === "string" ? raw.data.title.trim() : slug;
  const titleNp = typeof raw.data.title_np === "string" ? raw.data.title_np.trim() : undefined;
  if (!titleNp) {
    logMissingTranslation({ collection: "posts", slug, field: "title_np" });
  }
  if (!raw.data.body_np) {
    logMissingTranslation({ collection: "posts", slug, field: "body_np" });
  }

  const excerpt = buildExcerpt(raw.data.excerpt ?? raw.data.description, raw.content);

  return {
    id: slug,
    slug,
    title,
    title_np: titleNp,
    date: ensureIsoDate(raw.data.date),
    cover: typeof raw.data.cover === "string" ? raw.data.cover : undefined,
    tags: toStringArray(raw.data.tags),
    excerpt,
    author: typeof raw.data.author === "string" ? raw.data.author : undefined,
    body: raw.content,
    body_np: raw.data.body_np,
  };
}

function normalisePage(raw: RawDocument): PageDocument {
  const slug = deriveSlug(raw);
  const title = typeof raw.data.title === "string" ? raw.data.title.trim() : slug;
  const titleNp = typeof raw.data.title_np === "string" ? raw.data.title_np.trim() : undefined;
  if (!titleNp) {
    logMissingTranslation({ collection: "pages", slug, field: "title_np" });
  }
  if (!raw.data.body_np) {
    logMissingTranslation({ collection: "pages", slug, field: "body_np" });
  }

  return {
    id: slug,
    slug,
    title,
    title_np: titleNp,
    date: raw.data.date ? ensureIsoDate(raw.data.date) : undefined,
    cover: typeof raw.data.cover === "string" ? raw.data.cover : undefined,
    body: raw.content,
    body_np: raw.data.body_np,
    excerpt: buildExcerpt(raw.data.excerpt, raw.content),
  };
}

async function loadPostsFromDisk(): Promise<PostDocument[]> {
  const files = await walkFiles(POSTS_DIR);
  const docs = await Promise.all(files.map(readMdxFile));
  return docs
    .map(normalisePost)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function loadPagesFromDisk(): Promise<PageDocument[]> {
  const files = await walkFiles(PAGES_DIR);
  const docs = await Promise.all(files.map(readMdxFile));
  return docs
    .map(normalisePage)
    .sort((a, b) => {
      if (!a.date && !b.date) return a.slug.localeCompare(b.slug);
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export const getPostsIndex = unstable_cache(async (): Promise<PostSummary[]> => {
  const posts = await loadPostsFromDisk();
  return posts.map(({ body, body_np, ...summary }) => summary);
}, ["content", "posts", "index"], { tags: ["content"] });

export const getPostBySlug = unstable_cache(async (slug: string): Promise<PostDocument | null> => {
  const posts = await loadPostsFromDisk();
  return posts.find((post) => post.slug === slug) ?? null;
}, ["content", "posts", "detail"], { tags: ["content"] });

export const listPostSlugs = unstable_cache(async (): Promise<string[]> => {
  const posts = await getPostsIndex();
  return posts.map((post) => post.slug);
}, ["content", "posts", "slugs"], { tags: ["content"] });

export const getPagesIndex = unstable_cache(async (): Promise<PageSummary[]> => {
  const pages = await loadPagesFromDisk();
  return pages.map(({ body, body_np, ...summary }) => summary);
}, ["content", "pages", "index"], { tags: ["content"] });

export const getPageBySlug = unstable_cache(async (slug: string): Promise<PageDocument | null> => {
  const pages = await loadPagesFromDisk();
  return pages.find((page) => page.slug === slug) ?? null;
}, ["content", "pages", "detail"], { tags: ["content"] });

export const listPageSlugs = unstable_cache(async (): Promise<string[]> => {
  const pages = await getPagesIndex();
  return pages.map((page) => page.slug);
}, ["content", "pages", "slugs"], { tags: ["content"] });
