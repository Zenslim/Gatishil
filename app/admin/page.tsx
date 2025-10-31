"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_TINA_API_URL || "").replace(/\/+$/, "");

type Doc = {
  slug: string;
  collection: string;
  title_en?: string;
  title_np?: string;
  body_en?: string;
  body_np?: string;
  updatedAt?: string;
};

export default function AdminPage() {
  // sensible defaults
  const [collection, setCollection] = useState<string>("pages");
  const [slug, setSlug] = useState<string>("home");

  const [slugs, setSlugs] = useState<string[]>([]);
  const [doc, setDoc] = useState<Partial<Doc> | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const base = useMemo(() => API_URL, []);

  function warn(s: string) {
    setMsg(s);
    console.warn("[admin]", s);
  }

  function must(val: string, label: string) {
    const v = (val || "").trim();
    if (!v) throw new Error(`${label} is required`);
    if (!/^[a-z0-9-]+$/i.test(v)) throw new Error(`${label} must be letters, numbers or '-'`);
    return v.toLowerCase();
  }

  async function fetchJSON(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    let json: any = {};
    try {
      json = await res.json();
    } catch {
      // ignore parse errors; surface status below
    }
    if (!res.ok) {
      const why =
        json?.error ||
        `${res.status} ${res.statusText} (from ${new URL(url).pathname})`;
      throw new Error(why);
    }
    return json;
  }

  async function list() {
    try {
      setLoading(true);
      setMsg("");
      const col = must(collection, "Collection");
      const url = `${base}/content/${encodeURIComponent(col)}`;
      const data = await fetchJSON(url);
      setSlugs(Array.isArray(data.slugs) ? data.slugs : []);
      setMsg(`Found ${data.slugs?.length ?? 0} slugs in "${col}"`);
    } catch (e: any) {
      warn(e?.message || "List failed");
      setSlugs([]);
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    try {
      setLoading(true);
      setMsg("");
      const col = must(collection, "Collection");
      const s = must(slug, "Slug");
      const url = `${base}/content/${encodeURIComponent(col)}/${encodeURIComponent(s)}`;
      const data = await fetchJSON(url);
      setDoc({ ...(data.data || {}), collection: col, slug: s });
      setMsg(`Loaded "${s}" from "${col}"`);
      // keep dropdown in sync
      if (!slugs.includes(s)) setSlugs((prev) => [...prev, s]);
    } catch (e: any) {
      warn(e?.message || "Load failed");
      setDoc({ collection, slug });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setLoading(true);
      setMsg("");
      const col = must(collection, "Collection");
      const s = must(slug, "Slug");

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.NEXT_PUBLIC_TINA_HMAC) {
        headers["x-gatishil-hmac"] = process.env.NEXT_PUBLIC_TINA_HMAC!;
      }

      const url = `${base}/content/${encodeURIComponent(col)}/${encodeURIComponent(s)}`;
      const body = JSON.stringify(
        {
          ...(doc || {}),
          collection: col,
          slug: s,
        },
        null,
        2
      );

      await fetchJSON(url, { method: "PUT", headers, body });
      setMsg("Saved ✓");
    } catch (e: any) {
      warn(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!base) warn("NEXT_PUBLIC_TINA_API_URL is not set");
  }, [base]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Gatishil Admin (M1)</h1>
      <p className="text-sm opacity-70">
        Backend: <code>{base || "(missing env)"}</code>{" "}
        <a className="underline ml-2" href={`${base}/tina/health`} target="_blank">Health</a>{" "}
        <a className="underline ml-2" href={`${base}/tina/version`} target="_blank">Version</a>{" "}
        <a className="underline ml-2" href={`${base}/tina/graphql`} target="_blank">GraphQL (501)</a>
      </p>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Collection</label>
          <input
            placeholder="pages"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={list}
          className="px-3 py-2 border rounded hover:bg-gray-50"
          disabled={!base || loading}
          title="List slugs in this collection"
        >
          List
        </button>
        <div className="flex-1" />
      </div>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Slug</label>
          <input
            placeholder="home"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={load}
          className="px-3 py-2 border rounded hover:bg-gray-50"
          disabled={!base || loading}
          title="Load this document"
        >
          Load
        </button>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="border px-2 py-1 rounded"
          title="Known slugs"
        >
          {slugs.length === 0 ? <option>(none)</option> : slugs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Title (EN)</label>
          <input
            className="w-full border px-2 py-1 rounded"
            value={doc?.title_en || ""}
            onChange={(e) =>
              setDoc({ ...(doc || { slug, collection }), title_en: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm">Title (NP)</label>
          <input
            className="w-full border px-2 py-1 rounded"
            value={doc?.title_np || ""}
            onChange={(e) =>
              setDoc({ ...(doc || { slug, collection }), title_np: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm">Body (EN)</label>
          <textarea
            className="w-full h-40 border px-2 py-1 rounded"
            value={doc?.body_en || ""}
            onChange={(e) =>
              setDoc({ ...(doc || { slug, collection }), body_en: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm">Body (NP)</label>
          <textarea
            className="w-full h-40 border px-2 py-1 rounded"
            value={doc?.body_np || ""}
            onChange={(e) =>
              setDoc({ ...(doc || { slug, collection }), body_np: e.target.value })
            }
          />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={save}
          className="px-3 py-2 border rounded hover:bg-gray-50"
          disabled={!base || loading}
        >
          Save
        </button>
        <span className={`text-sm ${msg.startsWith("Saved") ? "text-green-500" : "text-red-400"}`}>
          {msg}
        </span>
      </div>

      <p className="text-xs opacity-60">
        Tip: Valid examples → Collection: <code>pages</code>, Slug: <code>home</code>
      </p>
    </div>
  );
}
