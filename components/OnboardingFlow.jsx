// components/OnboardingFlow.jsx
// Onboarding Flow: Screen 0 → 1 → 2 (your Roots picker) → Ikigai (3..7)
// Remote-only: Next.js + Vercel + Supabase. Reuses your ChautariLocationPicker as-is.

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";

// IMPORTANT: we do NOT modify your working Roots picker.
// If the file path differs, adjust the import path only.
const ChautariLocationPicker = dynamic(() => import("@/components/ChautariLocationPicker"), {
  ssr: false,
});

// ---------- tiny helpers ----------
const titleCase = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s|-|\/)\S/g, (t) => t.toUpperCase());

const norm = (s) => titleCase(String(s || "").slice(0, 48));
const dedupe = (arr) => Array.from(new Set((arr || []).map((x) => norm(x)))).filter(Boolean);
const byPrefixRank = (q) => (a, b) => {
  const qa = a.label.toLowerCase();
  const qb = b.label.toLowerCase();
  const ql = q.toLowerCase();
  const pa = qa.startsWith(ql) ? 0 : qa.includes(ql) ? 1 : 2;
  const pb = qb.startsWith(ql) ? 0 : qb.includes(ql) ? 1 : 2;
  if (pa !== pb) return pa - pb;
  return (b.popularity || 0) - (a.popularity || 0);
};

// ---------- generic UI bits ----------
function Button({ children, onClick, variant = "primary", disabled = false, full = false }) {
  const base =
    "px-4 py-3 rounded-2xl text-sm font-semibold transition shadow-sm focus:outline-none focus:ring";
  const styles =
    variant === "secondary"
      ? "bg-zinc-700 hover:bg-zinc-600 text-white"
      : "bg-amber-500 hover:bg-amber-400 text-black";
  const dis = disabled ? "opacity-50 pointer-events-none" : "";
  const w = full ? "w-full" : "";
  return (
    <button className={`${base} ${styles} ${dis} ${w}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-sm">
      {label}
      <button
        aria-label="remove"
        className="text-zinc-400 hover:text-zinc-200"
        onClick={onRemove}
      >
        ✕
      </button>
    </span>
  );
}

function SuggestModal({ open, typed, type, onCancel, onSubmit }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-[92vw] max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <h3 className="text-lg font-semibold mb-2">Add new option?</h3>
        <p className="text-sm text-zinc-300 mb-5">
          Suggest “<span className="font-semibold">{typed}</span>” as a new {type}.
          <br />
          A moderator will review to keep lists tidy.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- typeahead (single-select) ----------
function TypeaheadSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  starters = [],
  onSuggest,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const list = (options || []).filter((o) => o.active !== false);
    if (!q) return list.slice(0, 10);
    return list.sort(byPrefixRank(q)).slice(0, 10);
  }, [options, q]);

  return (
    <div className="w-full">
      <label className="block text-sm text-zinc-300 mb-2">{label}</label>
      <div className="relative">
        <input
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 outline-none focus:ring focus:ring-amber-500/30"
          placeholder={placeholder}
          value={value || q}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(null); // clear selected when typing
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 max-h-64 overflow-auto">
            {!q && starters?.length > 0 && (
              <div className="p-2 border-b border-zinc-800 flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm"
                    onMouseDown={() => {
                      onChange(norm(s));
                      setOpen(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {filtered.map((o) => (
              <button
                key={o.id || o.label}
                className="w-full text-left px-3 py-2 hover:bg-zinc-800"
                onMouseDown={() => {
                  onChange(o.label);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            ))}
            {q && filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-400">No matches.</div>
            )}
            {q && (
              <button
                className="w-full text-left px-3 py-2 border-t border-zinc-800 hover:bg-zinc-800 text-amber-400"
                onMouseDown={() => onSuggest(q)}
              >
                + Suggest “{q}”
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- chips input (multi-select) ----------
function ChipsTypeahead({
  label,
  values,
  setValues,
  options,
  placeholder = "Add…",
  starters = [],
  max = 8,
  onSuggest,
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 12);
    return options.sort(byPrefixRank(q)).slice(0, 12);
  }, [options, q]);

  const add = (txt) => {
    const next = dedupe([...(values || []), norm(txt)]);
    if (next.length > max) return;
    setValues(next);
    setQ("");
  };

  return (
    <div className="w-full">
      <label className="block text-sm text-zinc-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {(values || []).map((s) => (
          <Chip key={s} label={s} onRemove={() => setValues(values.filter((x) => x !== s))} />
        ))}
      </div>
      <input
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 outline-none focus:ring focus:ring-amber-500/30"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) add(q);
          if (e.key === "Backspace" && !q && values?.length) {
            setValues(values.slice(0, -1));
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {(q ? filtered.map((o) => o.label) : starters).slice(0, 12).map((s) => (
          <button
            key={s}
            className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm"
            onClick={() => add(s)}
          >
            {s}
          </button>
        ))}
        {q && (
          <button
            className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 hover:bg-zinc-800 text-sm"
            onClick={() => onSuggest(q)}
          >
            + Suggest “{q}”
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 mt-2">
        {values?.length || 0} / {max}
      </p>
    </div>
  );
}

// ---------- inline SVG: Tree with people under it ----------
function ChautariTreeSVG(props) {
  return (
    <svg
      viewBox="0 0 600 360"
      role="img"
      aria-label="People sitting under a tree"
      className="w-full h-auto drop-shadow-[0_0_40px_rgba(251,191,36,0.15)]"
      {...props}
    >
      <defs>
        <linearGradient id="leafGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
        <linearGradient id="skyGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0B1020" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#skyGrad)" />
      {/* ground */}
      <ellipse cx="300" cy="320" rx="250" ry="30" fill="#0f172a" />
      {/* trunk */}
      <path
        d="M290 320 C290 280 280 260 285 220 C290 190 300 180 305 160 C310 140 310 120 310 90 L330 90 C330 120 330 140 335 160 C340 180 350 190 355 220 C360 260 350 280 350 320 Z"
        fill="#5b3a29"
      />
      {/* canopy */}
      <circle cx="320" cy="110" r="90" fill="url(#leafGrad)" />
      <circle cx="260" cy="130" r="70" fill="url(#leafGrad)" opacity="0.9" />
      <circle cx="380" cy="140" r="70" fill="url(#leafGrad)" opacity="0.9" />
      {/* people silhouettes */}
      <g fill="#cbd5e1">
        <circle cx="240" cy="300" r="10" />
        <rect x="235" y="308" width="10" height="10" rx="2" />
        <circle cx="280" cy="300" r="10" />
        <rect x="275" y="308" width="10" height="10" rx="2" />
        <circle cx="320" cy="300" r="10" />
        <rect x="315" y="308" width="10" height="10" rx="2" />
        <circle cx="360" cy="300" r="10" />
        <rect x="355" y="308" width="10" height="10" rx="2" />
      </g>
    </svg>
  );
}

// ---------- main flow ----------
export default function OnboardingFlow() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // lists
  const [livelihoods, setLivelihoods] = useState([]);
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);

  // suggest modal
  const [modal, setModal] = useState({ open: false, type: "", typed: "" });

  // steps: 0..7
  const [step, setStep] = useState(0);
  const totalSteps = 8;

  // starters (safe defaults)
  const starterLivelihoods = [
    "Farmer",
    "Teacher",
    "Software Developer",
    "Driver",
    "Tailor",
    "Nurse",
    "Shopkeeper",
    "Carpenter",
  ];
  const starterSkills = [
    "Public Speaking",
    "Carpentry",
    "Data Analysis",
    "Excel/Sheets",
    "Sewing",
    "Customer Support",
    "Project Management",
    "Photography",
  ];
  const starterPassions = [
    "Teaching",
    "Making",
    "Healing",
    "Performing",
    "Coding",
    "Nature Care",
    "Storytelling",
    "Research",
  ];
  const starterNeeds = [
    "Youth Mentoring",
    "Elder Care",
    "Local Food",
    "Mental Health Support",
    "Street Safety",
    "Job Pathways",
    "Clean Water",
    "Arts for Kids",
  ];

  // fetch auth + profile + option lists
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const authUser = u?.user;
      setUser(authUser || null);

      if (authUser) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();
        setProfile(prof || { user_id: authUser.id });
      }

      const readList = async (table) =>
        (await supabase
          .from(table)
          .select("id,label,popularity,active")
          .order("popularity", { ascending: false })).data || [];

      setLivelihoods(await readList("livelihoods"));
      setSkills(await readList("skills"));
      setPassions(await readList("passions"));
      setNeeds(await readList("needs"));
    })();
  }, []);

  const pickProfileFields = (p) => ({
    // Name & face
    name: p?.name || null,
    thar: p?.thar || null, // surname
    photo: p?.photo || null,
    // Ikigai
    livelihood: p?.livelihood || null,
    skills: p?.skills ? dedupe(p.skills) : [],
    passions: p?.passions ? dedupe(p.passions) : [],
    needs: p?.needs ? dedupe(p.needs) : [],
    viability: p?.viability || null,
    transition_target: p?.transition_target || null,
    // Roots are handled by your existing picker (no extra fields here).
  });

  const saveProfile = async (patch) => {
    const payload = { ...(profile || {}), ...patch };
    setProfile(payload);
    if (!user) return;

    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          ...pickProfileFields(payload),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single()
      .catch(() => {});
  };

  const openSuggest = (type, typed) => setModal({ open: true, type, typed });
  const submitSuggest = async () => {
    const { type, typed } = modal;
    try {
      await supabase.from("suggested_terms").insert({
        type,
        label: norm(typed),
        slug: norm(typed).toLowerCase().replace(/\s+/g, "-"),
        by_user: user?.id || null,
      });
    } catch (_) {}
    setModal({ open: false, type: "", typed: "" });
  };

  const next = () => setStep((s) => Math.min(totalSteps - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // ----- Screen 0 — Entry Prompt -----
  const Screen0 = (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
        <ChautariTreeSVG />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-center">Welcome to the Chauṭarī</h1>
      <p className="text-sm text-zinc-300 text-center">
        Others are already sitting under the tree. Let’s introduce yourself.
      </p>
      <div className="pt-2">
        <Button full onClick={next}>Begin my circle</Button>
      </div>
    </div>
  );

  // ----- Screen 1 — Name & Face -----
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = () => fileInputRef.current?.click();

  const handleAvatar = async (file) => {
    if (!file || !user) return;
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      // Note: requires a public "avatars" bucket (standard Supabase practice).
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      await saveProfile({ photo: publicUrl?.publicUrl || null });
    } finally {
      setUploading(false);
    }
  };

  const Screen1 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">What should we call you in the circle?</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Name</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 outline-none focus:ring focus:ring-amber-500/30"
            placeholder="Your first name"
            value={profile?.name || ""}
            onChange={(e) => saveProfile({ name: norm(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Surname</label>
          <input
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 outline-none focus:ring focus:ring-amber-500/30"
            placeholder="Your surname"
            value={profile?.thar || ""}
            onChange={(e) => saveProfile({ thar: norm(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900">
          {profile?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-zinc-500 text-xs">
              No photo
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={pickImage} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload / Take Photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
          <p className="text-xs text-zinc-400">Tip: You can use your camera on mobile.</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={next} disabled={!profile?.name || !profile?.thar}>
          Next
        </Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 2 — Roots (Progressive Disclosure) -----
  // We deliberately do NOT change your working component. It controls its own behavior.
  // If your picker exposes save hooks, you can wire them later; for now we keep it simple.
  const Screen2 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Where do your roots touch the earth?</h2>
      <p className="text-sm text-zinc-400">
        Choose Province → District → Palika → Ward → Tole. Or toggle “I live abroad”.
      </p>

      <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-950">
        <ChautariLocationPicker />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={next}>Continue</Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 3 — Livelihood -----
  const Screen3 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">
        What work do your hands and mind do?
      </h2>
      <p className="text-sm text-zinc-400">Start with your main line of work.</p>
      <TypeaheadSelect
        label="Livelihood"
        value={profile?.livelihood || ""}
        onChange={(v) => saveProfile({ livelihood: v })}
        options={livelihoods}
        starters={starterLivelihoods}
        onSuggest={(q) => openSuggest("livelihood", q)}
      />
      <div className="flex gap-3 pt-2">
        <Button onClick={next} disabled={!profile?.livelihood}>
          Continue
        </Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 4 — Skills -----
  const Screen4 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">What are you reliably good at?</h2>
      <p className="text-sm text-zinc-400">Add up to 8. Short and simple works best.</p>
      <ChipsTypeahead
        label="Skills"
        values={profile?.skills || []}
        setValues={(vals) => saveProfile({ skills: vals })}
        options={skills}
        starters={starterSkills}
        max={8}
        onSuggest={(q) => openSuggest("skill", q)}
      />
      <div className="flex gap-3 pt-2">
        <Button onClick={next}>Continue</Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 5 — Passions -----
  const Screen5 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">What makes you feel alive lately?</h2>
      <p className="text-sm text-zinc-400">Pick a few you’d happily do for hours.</p>
      <ChipsTypeahead
        label="Passions"
        values={profile?.passions || []}
        setValues={(vals) => saveProfile({ passions: vals })}
        options={passions}
        starters={starterPassions}
        max={6}
        onSuggest={(q) => openSuggest("passion", q)}
      />
      <div className="flex gap-3 pt-2">
        <Button onClick={next}>Continue</Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 6 — Needs -----
  const Screen6 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">
        What needs around you pull your heart?
      </h2>
      <p className="text-sm text-zinc-400">These guide future invitations.</p>
      <ChipsTypeahead
        label="Community Needs"
        values={profile?.needs || []}
        setValues={(vals) => saveProfile({ needs: vals })}
        options={needs}
        starters={starterNeeds}
        max={6}
        onSuggest={(q) => openSuggest("need", q)}
      />
      <div className="flex gap-3 pt-2">
        <Button onClick={next}>Continue</Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  // ----- Screen 7 — Viability -----
  const Screen7 = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">
        Is this work sustaining you right now?
      </h2>
      <p className="text-sm text-zinc-400">Be honest; this guides future opportunities.</p>

      <div className="grid gap-3">
        {[
          { key: "paid", label: "Paid & stable" },
          { key: "part_time", label: "Part-time / side" },
          { key: "learning", label: "Learning / intern / volunteer" },
          { key: "exploring", label: "Exploring a shift" },
        ].map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
              profile?.viability === opt.key
                ? "border-amber-500 bg-amber-500/10"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              className="accent-amber-500"
              name="viability"
              checked={profile?.viability === opt.key}
              onChange={() => saveProfile({ viability: opt.key })}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {(profile?.viability === "learning" || profile?.viability === "exploring") && (
        <TypeaheadSelect
          label="Transition toward…"
          value={profile?.transition_target || ""}
          onChange={(v) => saveProfile({ transition_target: v })}
          options={livelihoods}
          starters={starterLivelihoods}
          onSuggest={(q) => openSuggest("livelihood", q)}
          placeholder="Type a livelihood…"
        />
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => next()}>Save & Continue</Button>
        <Button variant="secondary" onClick={() => next()}>
          Not sure yet
        </Button>
      </div>
    </div>
  );

  const screens = [Screen0, Screen1, Screen2, Screen3, Screen4, Screen5, Screen6, Screen7];

  return (
    <div className="min-h-[70vh] w-full px-5 py-8 md:py-10 bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={back}
            className={`text-sm ${
              step === 0 ? "text-zinc-700 pointer-events-none" : "text-zinc-400 hover:text-zinc-200"
            }`}
            aria-label="Back"
          >
            ← Back
          </button>
          <div className="text-xs text-zinc-400">
            Step {step + 1} of {totalSteps}
          </div>
        </div>

        {screens[step]}

        <div className="mt-10 flex items-center justify-between text-xs text-zinc-500">
          <div>Choices autosave. If offline, they’ll sync later.</div>
          <div className="flex gap-2">
            {Array.from({ length: screens.length }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-2 w-2 rounded-full ${
                  i <= step ? "bg-amber-500" : "bg-zinc-700"
                }`}
                title={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <SuggestModal
        open={modal.open}
        typed={modal.typed}
        type={modal.type}
        onCancel={() => setModal({ open: false, type: "", typed: "" })}
        onSubmit={submitSuggest}
      />
    </div>
  );
}
