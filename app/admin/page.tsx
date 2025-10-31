"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_TINA_API_URL || "";

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
  const [collection, setCollection] = useState("pages");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [slug, setSlug] = useState("home");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const base = useMemo(() => (API_URL || "").replace(/\/+$/, ""), []);

  async function list() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${base}/content/${collection}`);
      const json = await res.json();
      setSlugs(json.slugs || []);
    } catch (e: any) {
      setMessage(e?.message || "Failed to list");
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${base}/content/${collection}/${slug}`);
      const json = await res.json();
      setDoc(json.data || {});
    } catch (e: any) {
      setMessage(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.NEXT_PUBLIC_TINA_HMAC) {
        headers["x-gatishil-hmac"] = process.env.NEXT_PUBLIC_TINA_HMAC!;
      }
      const res = await fetch(`${base}/content/${collection}/${slug}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(doc || {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMessage("Saved ✓");
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!API_URL) setMessage("NEXT_PUBLIC_TINA_API_URL is not set");
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Gatishil Admin (M1)</h1>
      <p className="text-sm opacity-70">
        Backend: <code>{API_URL || "(missing env)"}</code>
      </p>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Collection</label>
          <input
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={list}
          className="px-3 py-2 border rounded hover:bg-gray-50"
          disabled={!API_URL || loading}
        >
          List
        </button>
        <div className="flex-1" />
        <a href={`${base}/tina/health`} target="_blank" className="text-sm underline">Health</a>
        <a href={`${base}/tina/version`} target="_blank" className="text-sm underline">Version</a>
        <a href={`${base}/tina/graphql`} target="_blank" className="text-sm underline">GraphQL (501)</a>
      </div>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={load}
          className="px-3 py-2 border rounded hover:bg-gray-50"
          disabled={!API_URL || loading}
        >
          Load
        </button>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {slugs.map((s) => (
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
          disabled={!API_URL || loading}
        >
          Save
        </button>
        <span className="text-sm">{message}</span>
      </div>

      <p className="text-xs opacity-60">
        M1 note: same backend URL later serves Tina Studio at <code>/tina/graphql</code>.
      </p>
    </div>
  );
}
