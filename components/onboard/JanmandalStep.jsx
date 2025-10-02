import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";

/**
 * Janmandal (5 mahābhūta) soul-imprint onboarding
 * Earth/Hands = work that sustains you
 * Water/Gifts = skills that flow naturally
 * Fire/Passion = what makes you feel alive
 * Air/Heart   = needs/compassion you’re drawn to
 * Space/Journey = season (rooted/branching/sapling/searching) + optional vision
 *
 * Notes
 * - English copy placeholders; swap to Nepali globally later.
 * - Unlimited chips; users can choose from starters or add their own.
 * - Autosaves to profiles.{hands,gifts,fire,heart,journey,vision} if those columns exist.
 *   If your schema is different, adjust the `save()` field names below (no other code changes needed).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : "");

const PROMPTS = {
  hands: [
    "What work sustains you right now?",
    "What are your hands busy with these days?",
    "When you wake up, what do your hands first do?",
    "What does your work give to others?",
  ],
  gifts: [
    "What feels easy to you but hard for others?",
    "What do people often call you for help with?",
    "What natural gift do you carry?",
    "What flows naturally like water for you?",
  ],
  fire: [
    "What makes you lose track of time?",
    "What makes you feel truly alive?",
    "What lights up your face?",
    "What pulls your heart without force?",
  ],
  heart: [
    "What suffering around you burns your heart?",
    "Who do you feel pulled to help?",
    "What need do you see in your community?",
    "What breaks your heart when you see it?",
  ],
  journey: [
    "Which season are you in now — rooting, branching, learning, or searching?",
    "What direction is calling you in this season?",
  ],
  affirmations: [
    "This is your first Janmandal.",
    "The light you gave now lives in our shared sky.",
    "We see you — welcome to the Chautari.",
  ],
};

/* ---------------- Small inline Chips + Typeahead ---------------- */
function TypeaheadChips({
  mode = "multi",
  value = [],
  max = 999,
  starters = [],
  placeholder = "Type to add…",
  onSearch, // async (q) => [name]
  onChange, // (array) => void
  onSuggest, // (text) => void
}) {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const res = await (onSearch ? onSearch(q) : []);
      setList(res || []);
    }, 150);
    return () => clearTimeout(t);
  }, [q, open, onSearch]);

  const titleCase = (s) =>
    s.toString().trim().toLowerCase().replace(/\s+/g, " ").split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ");

  const add = (item) => {
    const v = titleCase(item);
    if (!v) return;
    if (mode === "single") {
      onChange([v]);
      setQ("");
      setOpen(false);
      return;
    }
    const set = new Set((value || []).map(titleCase));
    if (set.has(v)) return;
    if ((value || []).length >= max) return;
    onChange([...(value || []), v]);
    setQ("");
    setOpen(false);
  };

  const remove = (idx) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  const showSuggest = q && (!list || list.length === 0);

  return (
    <div className="w-full">
      {mode === "multi" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {(value || []).map((v, i) => (
            <span key={`${v}-${i}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-black text-sm">
              {v}
              <button aria-label={`Remove ${v}`} className="text-black/70 hover:text-black" onClick={() => remove(i)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/20 outline-none focus:border-white/40"
        />
        {open && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl bg-[#0f0f14] border border-white/10 shadow-xl max-h-64 overflow-auto z-40">
            {!q && starters?.length > 0 && (
              <div className="p-2 flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button key={s} className="px-3 py-1 rounded-full bg-white text-black text-sm" onClick={() => add(s)}>{s}</button>
                ))}
              </div>
            )}
            {!!q && (
              <ul className="py-1">
                {list.map((name) => (
                  <li key={name}>
                    <button className="w-full text-left px-4 py-2 hover:bg-white/5 text-white" onClick={() => add(name)}>{name}</button>
                  </li>
                ))}
                {showSuggest && (
                  <li className="px-4 py-2 text-white/70 text-sm">
                    No match.{" "}
                    <button className="underline underline-offset-2" onClick={() => onSuggest && onSuggest(q)}>
                      Suggest “{q}”?
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Janmandal Step ---------------- */
function Toast({ message }) {
  if (!message) return null;
  return <div className="fixed top-4 right-4 z-50 rounded-xl px-4 py-2 shadow-lg bg-black/80 text-white text-sm">{message}</div>;
}

export default function JanmandalStep() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");

  const [hands, setHands] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [fire, setFire]   = useState([]);
  const [heart, setHeart] = useState([]);
  const [journey, setJourney] = useState("");
  const [vision, setVision]   = useState("");

  const [starters, setStarters] = useState({ hands: [], gifts: [], fire: [], heart: [] });

  const showToast = (msg) => { setToast(msg); clearTimeout(showToast._t); showToast._t = setTimeout(() => setToast(""), 1200); };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/join");
      setUser(user);

      // Load profile (if columns exist)
      const { data: prof } = await supabase
        .from("profiles")
        .select("hands,gifts,fire,heart,journey,vision")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prof) {
        setHands(prof.hands || []);
        setGifts(prof.gifts || []);
        setFire(prof.fire || []);
        setHeart(prof.heart || []);
        setJourney(prof.journey || "");
        setVision(prof.vision || "");
      }

      // Optional: load starters from read-only suggestion tables if you created them
      const tryLoad = async (table) => {
        const { data, error } = await supabase.from(table).select("name").eq("active", true).order("popularity", { ascending: false }).limit(8);
        return error ? [] : (data || []).map((r) => r.name);
      };
      const [hs, gs, fs, ht] = await Promise.all([
        tryLoad("jm_hands"),
        tryLoad("jm_gifts"),
        tryLoad("jm_fire"),
        tryLoad("jm_heart"),
      ]);
      setStarters({ hands: hs, gifts: gs, fire: fs, heart: ht });
    })();
  }, [router]);

  const save = async (payload) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
    if (!error) showToast("Saved.");
  };

  const Card = ({ title, subtitle, children }) => (
    <div className="p-5 rounded-2xl bg-[#0b0b0f] text-white border border-white/10">
      <div className="text-lg font-semibold mb-2">{title}</div>
      {subtitle && <div className="text-white/70 text-sm mb-3">{subtitle}</div>}
      {children}
    </div>
  );

  const finish = () => {
    const phrase = pick(PROMPTS.affirmations);
    setToast(phrase || "Welcome.");
    setTimeout(() => router.replace("/dashboard"), 800);
  };

  // Simple typeahead search using optional tables; if none, just echo starters
  const search = async (kind, q) => {
    const term = (q || "").trim();
    const map = { hands: "jm_hands", gifts: "jm_gifts", fire: "jm_fire", heart: "jm_heart" };
    const table = map[kind];
    if (!table) return [];
    if (!term) return starters[kind] || [];
    const { data } = await supabase.from(table).select("name").eq("active", true).ilike("name", `${term}%`).order("popularity", { ascending: false }).limit(10);
    return (data || []).map((r) => r.name);
  };

  const suggest = async (kind, value) => {
    // Optional: if jm_suggestions table exists; otherwise no-op
    try {
      await supabase.from("jm_suggestions").insert({ kind, value });
      showToast("Received your suggestion.");
    } catch {}
  };

  return (
    <div className="min-h-[70vh] px-4 pb-16 bg-[#050508]">
      <div className="max-w-3xl mx-auto pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Earth / Hands */}
        <Card title="✋ Earth • Hands" subtitle={pick(PROMPTS.hands)}>
          <TypeaheadChips
            value={hands}
            starters={starters.hands}
            placeholder="Add work…"
            onSearch={(q) => search("hands", q)}
            onChange={(arr) => { setHands(arr); save({ hands: arr }); }}
            onSuggest={(v) => suggest("hands", v)}
          />
        </Card>

        {/* Water / Gifts */}
        <Card title="🎁 Water • Gifts" subtitle={pick(PROMPTS.gifts)}>
          <TypeaheadChips
            value={gifts}
            starters={starters.gifts}
            placeholder="Add gift/skill…"
            onSearch={(q) => search("gifts", q)}
            onChange={(arr) => { setGifts(arr); save({ gifts: arr }); }}
            onSuggest={(v) => suggest("gifts", v)}
          />
        </Card>

        {/* Fire / Passion */}
        <Card title="🔥 Fire • Passion" subtitle={pick(PROMPTS.fire)}>
          <TypeaheadChips
            value={fire}
            starters={starters.fire}
            placeholder="Add passion…"
            onSearch={(q) => search("fire", q)}
            onChange={(arr) => { setFire(arr); save({ fire: arr }); }}
            onSuggest={(v) => suggest("fire", v)}
          />
        </Card>

        {/* Air / Heart (needs/compassion) */}
        <Card title="❤️ Air • Heart" subtitle={pick(PROMPTS.heart)}>
          <TypeaheadChips
            value={heart}
            starters={starters.heart}
            placeholder="Add need/compassion…"
            onSearch={(q) => search("heart", q)}
            onChange={(arr) => { setHeart(arr); save({ heart: arr }); }}
            onSuggest={(v) => suggest("heart", v)}
          />
        </Card>

        {/* Space / Journey */}
        <Card title="🌱 Space • Journey" subtitle={pick(PROMPTS.journey)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {["rooted","branching","sapling","searching"].map((k) => (
              <label key={k} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${journey===k ? "border-white" : "border-white/20 hover:border-white/40"}`}>
                <input type="radio" name="journey" checked={journey===k} onChange={()=>{ setJourney(k); save({ journey: k }); }} />
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>
          {(journey==="branching"||journey==="sapling"||journey==="searching") && (
            <div className="mt-3">
              <input
                value={vision}
                onChange={(e)=>{ setVision(e.target.value); save({ vision: e.target.value }); }}
                placeholder="Future direction…"
                className="w-full px-3 py-2 rounded-lg bg-white/5 text-white border border-white/20"
              />
            </div>
          )}
        </Card>

        <div className="md:col-span-2 flex justify-end">
          <button onClick={finish} className="px-5 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90">
            Proceed → Chautari
          </button>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
