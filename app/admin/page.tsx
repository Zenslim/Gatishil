"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Gatishil Admin Console (M2)
 * - Single-file beauty pass for /app/admin/page.tsx
 * - Zero new deps; Tailwind-only styling
 * - Same API contract as M1 (list/load/save via NEXT_PUBLIC_TINA_API_URL)
 * - Adds EN/NP tabs, nicer layout, better errors, CORS diagnostics, and kbd shortcuts:
 *      ⌘/Ctrl+L = Load,  ⌘/Ctrl+S = Save
 */

type Doc = {
  slug: string;
  collection: string;
  title_en?: string;
  title_np?: string;
  body_en?: string;
  body_np?: string;
  updatedAt?: string;
};

const RAW_API = (process.env.NEXT_PUBLIC_TINA_API_URL || "").replace(/\/+$/, "");

function cx(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

export default function AdminPage() {
  // model
  const [collection, setCollection] = useState("pages");
  const [slug, setSlug] = useState("home");
  const [slugs, setSlugs] = useState<string[]>([]);
  const [doc, setDoc] = useState<Partial<Doc> | null>(null);

  // ui state
  const [activeLang, setActiveLang] = useState<"en" | "np">("en");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [error, setError] = useState<string>("");

  // derived
  const api = useMemo(() => RAW_API, []);
  const baseOk = !!api;

  // helpers
  function must(val: string, label: string) {
    const v = (val || "").trim();
    if (!v) throw new Error(`${label} is required`);
    if (!/^[a-z0-9-]+$/i.test(v)) throw new Error(`${label} must contain letters, numbers, or '-'`);
    return v.toLowerCase();
  }

  async function fetchJSON(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, init);
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        // surface status below
      }
      if (!res.ok) {
        const why =
          json?.error ||
          `${res.status} ${res.statusText} (from ${new URL(url).pathname})`;
        throw new Error(why);
      }
      return json;
    } catch (e: any) {
      // CORS diagnosis (TypeError from failed fetch)
      if (e instanceof TypeError) {
        throw new Error(
          "Network/CORS error. Your Worker must allow this origin. " +
            "Add header: Access-Control-Allow-Origin: https://www.gatishilnepal.org"
        );
      }
      throw e;
    }
  }

  function setMsg(ok: string = "", err: string = "") {
    setHint(ok);
    setError(err);
  }

  // actions
  async function list() {
    try {
      setMsg();
      setLoading(true);
      const col = must(collection, "Collection");
      const data = await fetchJSON(`${api}/content/${encodeURIComponent(col)}`);
      const arr = Array.isArray(data?.slugs) ? data.slugs : [];
      setSlugs(arr);
      setMsg(`Found ${arr.length} item(s) in “${col}”`);
    } catch (e: any) {
      setMsg("", e.message || "Failed to list");
      setSlugs([]);
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    try {
      setMsg();
      setLoading(true);
      const col = must(collection, "Collection");
      const s = must(slug, "Slug");
      const data = await fetchJSON(
        `${api}/content/${encodeURIComponent(col)}/${encodeURIComponent(s)}`
      );
      const loaded: Partial<Doc> = { ...(data?.data || {}), collection: col, slug: s };
      setDoc(loaded);
      if (!slugs.includes(s)) setSlugs((prev) => [...prev, s]);
      setMsg(`Loaded “${s}” from “${col}”`);
    } catch (e: any) {
      setMsg("", e.message || "Failed to load");
      setDoc({ collection, slug });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setMsg();
      setSaving(true);
      const col = must(collection, "Collection");
      const s = must(slug, "Slug");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.NEXT_PUBLIC_TINA_HMAC) headers["x-gatishil-hmac"] = process.env.NEXT_PUBLIC_TINA_HMAC!;
      const body = JSON.stringify({ ...(doc || {}), collection: col, slug: s }, null, 2);
      await fetchJSON(
        `${api}/content/${encodeURIComponent(col)}/${encodeURIComponent(s)}`,
        { method: "PUT", headers, body }
      );
      setMsg("Saved ✓");
    } catch (e: any) {
      setMsg("", e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // keyboard: ⌘/Ctrl+S to save, ⌘/Ctrl+L to load
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        void load();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, slug, doc]);

  useEffect(() => {
    if (!baseOk) setMsg("", "NEXT_PUBLIC_TINA_API_URL is not set");
  }, [baseOk]);

  // ui parts
  function StatPill({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/80">
        <span className="opacity-70">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    );
  }

  const langTitleKey = activeLang === "en" ? "title_en" : "title_np";
  const langBodyKey = activeLang === "en" ? "body_en" : "body_np";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Gatishil Admin</h1>
            <p className="text-sm text-white/60">
              Edge-native editor for bilingual content (EN ↔ NP)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Backend" value={api || "(missing env)"} />
            <a
              className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
              href={`${api}/tina/health`}
              target="_blank"
            >
              Health
            </a>
            <a
              className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
              href={`${api}/tina/version`}
              target="_blank"
            >
              Version
            </a>
            <a
              className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
              href={`${api}/tina/graphql`}
              target="_blank"
            >
              GraphQL
            </a>
          </div>
        </div>

        {/* Alerts */}
        {(hint || error) && (
          <div
            className={cx(
              "mt-6 rounded-xl border px-4 py-3 backdrop-blur-sm",
              hint && !error && "border-emerald-500/30 bg-emerald-500/10",
              error && "border-red-500/30 bg-red-500/10"
            )}
          >
            <p className={cx("text-sm", error ? "text-red-200" : "text-emerald-200")}>
              {error || hint}
            </p>
            {error?.toLowerCase().includes("cors") && (
              <p className="mt-1 text-xs text-red-200/80">
                Tip: In your Cloudflare Worker, add
                {" "}
                <code className="rounded bg-black/40 px-1 py-0.5">Access-Control-Allow-Origin: https://www.gatishilnepal.org</code>
                {" "}
                (or your preview domain) and allow <code className="rounded bg-black/40 px-1 py-0.5">PUT</code> &amp; <code className="rounded bg-black/40 px-1 py-0.5">GET</code>.
              </p>
            )}
          </div>
        )}

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          {/* Row: Collection + Slug */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Collection</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                placeholder="pages"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              />
            </div>
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Slug</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                placeholder="home"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <button
                onClick={list}
                disabled={!baseOk || loading}
                className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 px-4 font-medium hover:bg-white/20 disabled:opacity-50"
                title="⌘/Ctrl+L"
              >
                {loading ? "Listing…" : "List"}
              </button>
              <button
                onClick={load}
                disabled={!baseOk || loading}
                className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 px-4 font-medium hover:bg-white/20 disabled:opacity-50"
                title="⌘/Ctrl+L"
              >
                {loading ? "Loading…" : "Load"}
              </button>
            </div>
          </div>

          {/* Known slugs */}
          <div className="mt-4">
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Known Slugs</label>
            <select
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {slugs.length === 0 ? (
                <option>(none)</option>
              ) : (
                slugs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-white/50">
              Example: Collection <code>pages</code>, Slug <code>home</code>
            </p>
          </div>

          {/* Language Tabs */}
          <div className="mt-6 border-b border-white/10">
            <nav className="flex gap-2">
              {(["en", "np"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setActiveLang(lng)}
                  className={cx(
                    "rounded-t-lg px-4 py-2 text-sm",
                    activeLang === lng
                      ? "bg-white/15 border-x border-t border-white/10 font-semibold"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  {lng === "en" ? "English" : "नेपाली"}
                </button>
              ))}
              <div className="flex-1" />
              {doc?.updatedAt && (
                <div className="self-end pb-2 text-xs text-white/50">
                  Updated: {new Date(doc.updatedAt).toLocaleString()}
                </div>
              )}
            </nav>
          </div>

          {/* Editors */}
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                {activeLang === "en" ? "Title (EN)" : "Title (NP)"}
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                value={(doc as any)?.[langTitleKey] || ""}
                onChange={(e) =>
                  setDoc({
                    ...(doc || { collection, slug }),
                    [langTitleKey]: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                {activeLang === "en" ? "Body (EN)" : "Body (NP)"}
              </label>
              <textarea
                className="h-56 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                value={(doc as any)?.[langBodyKey] || ""}
                onChange={(e) =>
                  setDoc({
                    ...(doc || { collection, slug }),
                    [langBodyKey]: e.target.value,
                  })
                }
              />
              <div className="mt-1 text-right text-xs text-white/50">
                {(doc as any)?.[langBodyKey]?.length || 0} characters
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={!baseOk || saving}
              className="h-11 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
              title="⌘/Ctrl+S"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setDoc({ collection, slug, title_en: "", title_np: "", body_en: "", body_np: "" })}
              className="h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-white/80 hover:bg-white/10"
            >
              Reset Draft
            </button>
            <div className="text-xs text-white/50">
              Shortcuts: <kbd className="rounded bg-black/40 px-1">⌘/Ctrl</kbd> + <kbd className="rounded bg-black/40 px-1">L</kbd> = Load,&nbsp;
              <kbd className="rounded bg-black/40 px-1">⌘/Ctrl</kbd> + <kbd className="rounded bg-black/40 px-1">S</kbd> = Save
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/40">
          Gatishil Admin • Beautiful, bilingual, and sovereign. If listing fails, confirm your Worker route:
          <code className="ml-1 rounded bg-white/5 px-1 py-0.5">/content/:collection</code> and
          <code className="ml-1 rounded bg-white/5 px-1 py-0.5">/content/:collection/:slug</code>.
        </p>
      </div>
    </div>
  );
}
