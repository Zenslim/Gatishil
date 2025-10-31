"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Gatishil Admin (M4)
 * - Adds a WYSIWYG-style Markdown toolbar (selection-aware)
 * - Live preview, Published toggle, EN→NP copy helper
 * - No new deps; Tailwind only
 * - Shortcuts: ⌘/Ctrl+L = Load, ⌘/Ctrl+S = Save
 */

type Doc = {
  slug: string;
  collection: string;
  title_en?: string;
  title_np?: string;
  body_en?: string;
  body_np?: string;
  published?: boolean;
  updatedAt?: string;
};

const RAW_API = (process.env.NEXT_PUBLIC_TINA_API_URL || "").replace(/\/+$/, "");

function cx(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

// ultra-light markdown (headings, bold, italics, code, links, newlines)
function mdLite(src: string): string {
  if (!src) return "";
  let html = src;
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(
    /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a href="$2" target="_blank" class="underline">$1</a>`
  );
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = "<p>" + html.replace(/\n/g, "<br/>") + "</p>";
  return html;
}

// --- selection helpers for the toolbar ---
function applyWrap(
  el: HTMLTextAreaElement,
  left: string,
  right: string = left,
  fallbackText = "text"
) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const before = value.slice(0, s);
  const sel = value.slice(s, e) || fallbackText;
  const after = value.slice(e);
  const next = `${before}${left}${sel}${right}${after}`;
  const caret = s + left.length + sel.length + right.length;
  return { next, start: caret, end: caret };
}

function applyPrefixLines(el: HTMLTextAreaElement, prefix: string) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const before = value.slice(0, s);
  const sel = value.slice(s, e);
  const after = value.slice(e);
  const block = (sel || "New line").split("\n").map((ln) => (ln ? prefix + ln : prefix)).join("\n");
  const next = `${before}${block}${after}`;
  const caret = s + block.length;
  return { next, start: caret, end: caret };
}

function applyHeading(el: HTMLTextAreaElement, level = 2) {
  const hashes = "#".repeat(Math.min(6, Math.max(1, level)));
  return applyPrefixLines(el, `${hashes} `);
}

function applyLink(el: HTMLTextAreaElement) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const before = value.slice(0, s);
  const sel = value.slice(s, e) || "link text";
  const url = "https://example.com";
  const next = `${before}[${sel}](${url})${value.slice(e)}`;
  const caret = before.length + 1 + sel.length + 1; // place cursor inside []
  return { next, start: caret, end: caret + sel.length };
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

  const api = useMemo(() => RAW_API, []);
  const baseOk = !!api;

  // refs for toolbar operations
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  function must(val: string, label: string) {
    const v = (val || "").trim();
    if (!v) throw new Error(`${label} is required`);
    if (!/^[a-z0-9-]+$/i.test(v)) throw new Error(`${label} must be letters, numbers, or '-'`);
    return v.toLowerCase();
  }

  async function fetchJSON(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, init);
      let json: any = {};
      try { json = await res.json(); } catch {}
      if (!res.ok) {
        const why = json?.error || `${res.status} ${res.statusText} (${new URL(url).pathname})`;
        throw new Error(why);
      }
      return json;
    } catch (e: any) {
      if (e instanceof TypeError) {
        throw new Error(
          "Network/CORS error. Add: Access-Control-Allow-Origin: https://www.gatishilnepal.org"
        );
      }
      throw e;
    }
  }

  function setMsg(ok: string = "", err: string = "") {
    setHint(ok);
    setError(err);
  }

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
      const loaded: Partial<Doc> = {
        ...(data?.data || {}),
        collection: col,
        slug: s,
        published: !!data?.data?.published,
      };
      setDoc(loaded);
      if (!slugs.includes(s)) setSlugs((prev) => [...prev, s]);
      setMsg(`Loaded “${s}” from “${col}”`);
    } catch (e: any) {
      setMsg("", e.message || "Failed to load");
      setDoc({ collection, slug, published: false });
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
      if (process.env.NEXT_PUBLIC_TINA_HMAC)
        headers["x-gatishil-hmac"] = process.env.NEXT_PUBLIC_TINA_HMAC!;
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); void save(); }
      if (e.key.toLowerCase() === "l") { e.preventDefault(); void load(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, slug, doc]);

  useEffect(() => {
    if (!baseOk) setMsg("", "NEXT_PUBLIC_TINA_API_URL is not set");
  }, [baseOk]);

  const langTitleKey = activeLang === "en" ? "title_en" : "title_np";
  const langBodyKey  = activeLang === "en" ? "body_en"  : "body_np";

  const previewTitle =
    (doc as any)?.[langTitleKey] || (activeLang === "en" ? "Untitled (EN)" : "शीर्षक छैन (NP)");
  const previewBody = mdLite((doc as any)?.[langBodyKey] || "");

  // toolbar click handler
  function onTool(action: string) {
    const el = bodyRef.current;
    if (!el) return;
    let patch:
      | { next: string; start: number; end: number }
      | undefined;

    switch (action) {
      case "bold": patch = applyWrap(el, "**"); break;
      case "italic": patch = applyWrap(el, "*"); break;
      case "quote": patch = applyPrefixLines(el, "> "); break;
      case "code": patch = applyWrap(el, "`"); break;
      case "h2": patch = applyHeading(el, 2); break;
      case "ul": patch = applyPrefixLines(el, "- "); break;
      case "ol": patch = applyPrefixLines(el, "1. "); break;
      case "codeblock": patch = applyWrap(el, "\n```\n", "\n```\n", "code"); break;
      case "link": patch = applyLink(el); break;
      default: break;
    }

    if (!patch) return;
    const next = patch.next;
    const updated = { ...(doc || { collection, slug }), [langBodyKey]: next } as any;
    setDoc(updated);

    // update selection after render tick
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      bodyRef.current.focus();
      bodyRef.current.selectionStart = patch!.start;
      bodyRef.current.selectionEnd = patch!.end;
    });
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Gatishil Admin</h1>
            <p className="text-sm text-white/60">Bilingual editor with Markdown toolbar + live preview</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/80">
              Backend: {api || "(missing env)"}
            </span>
            <a className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10" href={`${api}/tina/health`} target="_blank">Health</a>
            <a className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10" href={`${api}/tina/version`} target="_blank">Version</a>
            <a className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10" href={`${api}/tina/graphql`} target="_blank">GraphQL</a>
          </div>
        </div>

        {(hint || error) && (
          <div className={cx("mt-6 rounded-xl border px-4 py-3 backdrop-blur-sm",
            hint && !error && "border-emerald-500/30 bg-emerald-500/10",
            error && "border-red-500/30 bg-red-500/10")}>
            <p className={cx("text-sm", error ? "text-red-200" : "text-emerald-200")}>
              {error || hint}
            </p>
            {error?.toLowerCase().includes("cors") && (
              <p className="mt-1 text-xs text-red-200/80">
                Worker header needed: <code className="rounded bg-black/40 px-1 py-0.5">Access-Control-Allow-Origin: https://www.gatishilnepal.org</code> with methods <code className="rounded bg-black/40 px-1 py-0.5">GET, PUT</code>.
              </p>
            )}
          </div>
        )}

        {/* Main Grid: Editor | Preview */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
            {/* Row: Collection + Slug + Actions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Collection</label>
                <input className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                  placeholder="pages" value={collection} onChange={(e) => setCollection(e.target.value)} />
              </div>
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Slug</label>
                <input className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                  placeholder="home" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="md:col-span-4 flex items-end gap-2">
                <button onClick={list} disabled={!baseOk || loading}
                  className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 px-4 font-medium hover:bg-white/20 disabled:opacity-50" title="⌘/Ctrl+L">
                  {loading ? "Listing…" : "List"}
                </button>
                <button onClick={load} disabled={!baseOk || loading}
                  className="h-10 flex-1 rounded-lg border border-white/10 bg-white/10 px-4 font-medium hover:bg-white/20 disabled:opacity-50" title="⌘/Ctrl+L">
                  {loading ? "Loading…" : "Load"}
                </button>
              </div>
            </div>

            {/* Known slugs */}
            <div className="mt-4">
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Known Slugs</label>
              <select className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                value={slug} onChange={(e) => setSlug(e.target.value)}>
                {slugs.length === 0 ? <option>(none)</option> : slugs.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="mt-1 text-xs text-white/50">Example: Collection <code>pages</code>, Slug <code>home</code></p>
            </div>

            {/* Top row: Lang tabs + Published */}
            <div className="mt-6 flex items-center gap-3 border-b border-white/10 pb-2">
              <nav className="flex gap-2">
                {(["en", "np"] as const).map((lng) => (
                  <button key={lng} onClick={() => setActiveLang(lng)}
                    className={cx("rounded-t-lg px-4 py-2 text-sm",
                      activeLang === lng ? "bg-white/15 border-x border-t border-white/10 font-semibold"
                                         : "text-white/60 hover:text-white")}>
                    {lng === "en" ? "English" : "नेपाली"}
                  </button>
                ))}
              </nav>
              <div className="flex-1" />
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" className="h-4 w-4 accent-emerald-500"
                  checked={!!doc?.published}
                  onChange={(e) => setDoc({ ...(doc || { collection, slug }), published: e.target.checked })} />
                Published
              </label>
            </div>

            {/* Title */}
            <div className="mt-4">
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">
                {activeLang === "en" ? "Title (EN)" : "Title (NP)"}
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                value={(doc as any)?.[langTitleKey] || ""}
                onChange={(e) => setDoc({ ...(doc || { collection, slug }), [langTitleKey]: e.target.value })}
              />
            </div>

            {/* Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[
                ["bold", "B"],
                ["italic", "I"],
                ["h2", "H2"],
                ["link", "🔗"],
                ["quote", "❝"],
                ["code", "</>"],
                ["ul", "• List"],
                ["ol", "1. List"],
                ["codeblock", "Code Block"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onTool(key)}
                  className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
                >
                  {label}
                </button>
              ))}
              {activeLang === "np" && (
                <button
                  onClick={() =>
                    setDoc({
                      ...(doc || { collection, slug }),
                      title_np: doc?.title_en || "",
                      body_np: doc?.body_en || "",
                    })
                  }
                  className="ml-auto rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                >
                  Translate from English (copy)
                </button>
              )}
            </div>

            {/* Body editor */}
            <div className="mt-2">
              <textarea
                ref={bodyRef}
                className="h-56 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-white/30"
                value={(doc as any)?.[langBodyKey] || ""}
                onChange={(e) => setDoc({ ...(doc || { collection, slug }), [langBodyKey]: e.target.value })}
              />
              <div className="mt-1 text-right text-xs text-white/50">
                {(doc as any)?.[langBodyKey]?.length || 0} characters
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={save} disabled={!baseOk || saving}
                className="h-11 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                title="⌘/Ctrl+S">
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setDoc({ collection, slug, title_en: "", title_np: "", body_en: "", body_np: "", published: false })}
                className="h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-white/80 hover:bg-white/10"
              >
                Reset Draft
              </button>
              <a href={`/${slug}`} target="_blank"
                 className="h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-white/80 hover:bg-white/10 flex items-center">
                Open Public Page ↗
              </a>
              <div className="text-xs text-white/50">
                Shortcuts: <kbd className="rounded bg-black/40 px-1">⌘/Ctrl</kbd> + <kbd className="rounded bg-black/40 px-1">L</kbd> = Load,&nbsp;
                <kbd className="rounded bg-black/40 px-1">⌘/Ctrl</kbd> + <kbd className="rounded bg-black/40 px-1">S</kbd> = Save
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Preview — {activeLang === "en" ? "English" : "नेपाली"}</h2>
              <span className={cx(
                "rounded-full px-3 py-1 text-xs border",
                doc?.published ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                : "border-yellow-400/40 bg-yellow-500/10 text-yellow-200"
              )}>
                {doc?.published ? "Published" : "Draft"}
              </span>
            </div>
            <div className="mt-4 space-y-3 prose prose-invert max-w-none">
              <h1 className="!mb-2 text-2xl font-bold">{previewTitle}</h1>
              <article className="text-sm/7 text-white/90" dangerouslySetInnerHTML={{ __html: previewBody }} />
            </div>
            <p className="mt-4 text-xs text-white/40">
              Markdown supported: # H1, ## H2, **bold**, *italics*, `code`, [link](https://…)
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">Gatishil Admin • Beautiful, bilingual, sovereign.</p>
      </div>
    </div>
  );
}
