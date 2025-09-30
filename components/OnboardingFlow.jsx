// components/OnboardingFlow.jsx
"use client";

/**
 * Fixes:
 * 1) Robust image cropping guards to prevent "drawImage ... Overload resolution failed".
 * 2) Continue never stalls: Name & Face -> Roots always advances (save is best-effort).
 *
 * Note on "Multiple GoTrueClient instances..." warning:
 * - This component imports a single Supabase client from "@/lib/supabaseClient".
 * - The warning appears when *other* parts of the app also create clients with the
 *   same storage key. It's harmless but avoid creating extra clients elsewhere.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import ChautariLocationPicker from "./ChautariLocationPicker";
import { supabase } from "@/lib/supabaseClient";

const titleCase = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s|-|\/)\S/g, (t) => t.toUpperCase());
const norm = (s) => titleCase(String(s || "").slice(0, 48));
const dedupe = (arr) =>
  Array.from(new Set((arr || []).map((x) => norm(x)))).filter(Boolean);
const byPrefixRank = (q) => (a, b) => {
  const qa = a.label.toLowerCase();
  const qb = b.label.toLowerCase();
  const ql = (q || "").toLowerCase();
  const pa = q ? (qa.startsWith(ql) ? 0 : qa.includes(ql) ? 1 : 2) : 0;
  const pb = q ? (qb.startsWith(ql) ? 0 : qb.includes(ql) ? 1 : 2) : 0;
  if (pa !== pb) return pa - pb;
  return (b.popularity || 0) - (a.popularity || 0);
};

function Button({ children, onClick, variant = "primary", disabled = false }) {
  const base =
    "px-4 py-2 rounded-2xl text-sm font-semibold transition shadow-sm focus:outline-none focus:ring";
  const styles =
    variant === "secondary"
      ? "bg-zinc-700 hover:bg-zinc-600 text-white"
      : "bg-amber-500 hover:bg-amber-400 text-black";
  const dis = disabled ? "opacity-50 pointer-events-none" : "";
  return (
    <button className={`${base} ${styles} ${dis}`} onClick={onClick} disabled={disabled}>
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
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSubmit}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

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
            onChange(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
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
      <p className="text-xs text-zinc-400 mt-2">{values?.length || 0} / {max}</p>
    </div>
  );
}

const steps = [
  "entry",
  "name_face",
  "roots",
  "livelihood",
  "passions",
  "needs",
  "viability",
  "story",
  "vow",
  "reveal",
];

export default function OnboardingFlow() {
  const urlStep =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("step")
      : null;
  const initialStep = steps.includes(urlStep || "") ? urlStep : "entry";

  const [step, setStep] = useState(initialStep);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [livelihoods, setLivelihoods] = useState([]);
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);

  const [modal, setModal] = useState({ open: false, type: "", typed: "" });

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");

  // crop state
  const [rawPhotoSrc, setRawPhotoSrc] = useState("");
  const imgEl = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState("");
  const [cropping, setCropping] = useState(false);
  const [uploading, setUploading] = useState(false);

  const starterLivelihoods = [
    "Farmer","Teacher","Software Developer","Driver","Tailor","Nurse","Shopkeeper","Carpenter",
  ];
  const starterSkills = [
    "Public Speaking","Carpentry","Data Analysis","Excel/Sheets","Sewing","Customer Support","Project Management","Photography",
  ];
  const starterPassions = [
    "Teaching","Making","Healing","Performing","Coding","Nature Care","Storytelling","Research",
  ];
  const starterNeeds = [
    "Youth Mentoring","Elder Care","Local Food","Mental Health Support","Street Safety","Job Pathways","Clean Water","Arts for Kids",
  ];

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const authUser = u?.user;
        setUser(authUser || null);

        if (authUser) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle();
          setProfile(
            prof || {
              user_id: authUser.id,
              roots_json: null,
              diaspora_json: null,
              livelihood: null,
              skills: [],
              passions: [],
              needs: [],
              viability: null,
              transition_target: null,
            }
          );

          if (prof?.name) {
            const parts = String(prof.name).trim().split(/\s+/);
            setFirstName(norm(parts[0] || ""));
            setSurname(norm(parts.slice(1).join(" ")));
          }
        }

        const readList = async (table) =>
          (await supabase
            .from(table)
            .select("id,label,popularity,active")
            .order("popularity", { ascending: false })
          ).data || [];

        setLivelihoods(await readList("livelihoods"));
        setSkills(await readList("skills"));
        setPassions(await readList("passions"));
        setNeeds(await readList("needs"));
      } catch {
        // ignore; UI stays usable
      }
    })();
  }, []);

  const pickProfileFields = (p) => ({
    name: p?.name || null,
    photo_url: p?.photo_url || null,
    roots_json: p?.roots_json || null,
    diaspora_json: p?.diaspora_json || null,
    livelihood: p?.livelihood || null,
    skills: p?.skills ? dedupe(p.skills) : [],
    passions: p?.passions ? dedupe(p.passions) : [],
    needs: p?.needs ? dedupe(p.needs) : [],
    viability: p?.viability || null,
    transition_target: p?.transition_target || null,
    updated_at: new Date().toISOString(),
  });

  const saveProfile = async (patch) => {
    const payload = { ...(profile || {}), ...patch };
    setProfile(payload);
    if (!user) return;

    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, ...pickProfileFields(payload) }, { onConflict: "user_id" })
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
    } catch {}
    setModal({ open: false, type: "", typed: "" });
  };

  const next = (to) => setStep(to);
  const back = () => {
    const i = Math.max(0, steps.indexOf(step) - 1);
    setStep(steps[i]);
  };

  // ---------- crop helpers with HARD GUARDS ----------
  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      if (!src) return reject(new Error("No image source"));
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src; // data: URL stays same-origin
    });

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await loadImage(imageSrc);
    // validate crop
    if (
      !pixelCrop ||
      !isFinite(pixelCrop.x) ||
      !isFinite(pixelCrop.y) ||
      !isFinite(pixelCrop.width) ||
      !isFinite(pixelCrop.height) ||
      pixelCrop.width <= 0 ||
      pixelCrop.height <= 0
    ) {
      throw new Error("Invalid crop rectangle");
    }

    // clamp to image bounds
    const sx = clamp(pixelCrop.x, 0, image.width);
    const sy = clamp(pixelCrop.y, 0, image.height);
    const sw = clamp(pixelCrop.width, 1, image.width - sx);
    const sh = clamp(pixelCrop.height, 1, image.height - sy);

    const size = Math.max(sw, sh);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();

    // drawImage with validated numbers
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", 0.9);
  }

  const confirmCrop = async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const dataUrl = await getCroppedImg(rawPhotoSrc, croppedAreaPixels);
      setCroppedPreview(dataUrl);
    } catch {
      // soft fail: keep user on screen; they can re-try
    } finally {
      setCropping(false);
    }
  };

  async function uploadPhotoIfNeededAndSave() {
    setUploading(true);
    try {
      let publicUrl = profile?.photo_url || "";

      if (!publicUrl && croppedPreview && user) {
        const res = await fetch(croppedPreview);
        const blob = await res.blob();
        const fileName = `profiles/${user.id}.jpg`;
        await supabase.storage
          .from("profiles")
          .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });
        const { data: pub } = supabase.storage.from("profiles").getPublicUrl(fileName);
        publicUrl = pub?.publicUrl || "";
      }

      const displayName = [firstName, surname].filter(Boolean).join(" ");
      await saveProfile({ name: displayName || null, photo_url: publicUrl || null });
    } catch {
      // swallow; never block UX
    } finally {
      setUploading(false);
    }
  }

  const continueFromNameFace = async () => {
    await uploadPhotoIfNeededAndSave();
    next("roots");
  };

  const canContinueNameFace =
    Boolean(firstName?.trim()) && Boolean(surname?.trim()) && Boolean(croppedPreview);

  // ---------- SCREENS ----------
  const ScreenEntry = (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
      <p className="text-slate-300">Others are already sitting under the tree. Let’s introduce you.</p>
      <Button onClick={() => next("name_face")}>Begin my circle</Button>
    </div>
  );

  const ScreenNameFace = (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Screen 1 — Name & Face</h2>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">First Name</label>
          <input
            type="text"
            placeholder="e.g., Nabin"
            value={firstName}
            onChange={(e) => setFirstName(norm(e.target.value))}
            className="w-full rounded-lg border border-white/20 bg-black/30 p-3"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Surname (Thar)</label>
          <input
            type="text"
            placeholder="e.g., Pradhan"
            value={surname}
            onChange={(e) => setSurname(norm(e.target.value))}
            className="w-full rounded-lg border border-white/20 bg-black/30 p-3"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Use your family surname (Thar). This helps with cultural onboarding.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-slate-300">Add your photo (no mask in the chauṭarī)</p>

        {!rawPhotoSrc && !croppedPreview && (
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const durl = await fileToDataURL(file);
              setRawPhotoSrc(durl);
              setCroppedPreview("");
              // create a hidden <img> for intrinsic size (extra guard)
              const img = new Image();
              img.onload = () => (imgEl.current = img);
              img.src = durl;
            }}
            className="block w-full text-sm text-slate-400
              file:mr-4 file:rounded-lg file:border-0
              file:bg-amber-400 file:px-4 file:py-2
              file:text-sm file:font-semibold file:text-black
              hover:file:bg-amber-500"
          />
        )}

        {rawPhotoSrc && !croppedPreview && (
          <div className="space-y-3">
            <div className="relative h-64 w-full overflow-hidden rounded-xl border border-white/10">
              <Cropper
                image={rawPhotoSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
              aria-label="Zoom"
            />
            <div className="flex gap-2">
              <Button onClick={confirmCrop} disabled={cropping}>
                {cropping ? "Cropping…" : "Save crop"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setRawPhotoSrc("");
                  setCroppedPreview("");
                  imgEl.current = null;
                }}
              >
                Choose another
              </Button>
            </div>
          </div>
        )}

        {croppedPreview && (
          <div className="text-center space-y-2">
            <img
              src={croppedPreview}
              alt="Cropped preview"
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
            <button
              onClick={() => setCroppedPreview("")}
              className="text-xs text-slate-300 underline"
            >
              Re-crop
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={continueFromNameFace} disabled={!canContinueNameFace}>
          Continue
        </Button>
        <Button variant="secondary" onClick={() => next("roots")}>
          Skip for now
        </Button>
      </div>
    </div>
  );

  const ScreenRoots = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Screen 2 — Roots</h2>
      <p className="text-sm text-zinc-400">Where do your roots touch the earth?</p>
      <ChautariLocationPicker
        value={profile?.roots_json || null}
        onChange={async (v) => {
          await saveProfile({
            roots_json: v?.type === "ward" ? v : null,
            diaspora_json: v?.type === "city" ? v : null,
          });
        }}
      />
      {(profile?.roots_json?.label || profile?.diaspora_json?.label) && (
        <p className="text-sm text-slate-300">
          Selected: {profile?.roots_json?.label || profile?.diaspora_json?.label}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("livelihood")}>Continue</Button>
        <Button variant="secondary" onClick={() => back()}>Back</Button>
      </div>
    </div>
  );

  const ScreenLivelihood = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Screen 3 — Livelihood & Skills</h2>
      <p className="text-sm text-zinc-400">What work do your hands and mind do?</p>

      <TypeaheadSelect
        label="Livelihood"
        value={profile?.livelihood || ""}
        onChange={(v) => saveProfile({ livelihood: v })}
        options={livelihoods}
        starters={starterLivelihoods}
        onSuggest={(q) => openSuggest("livelihood", q)}
        placeholder="Type a livelihood…"
      />

      <ChipsTypeahead
        label="Skills (add up to 8)"
        values={profile?.skills || []}
        setValues={(vals) => saveProfile({ skills: vals })}
        options={skills}
        starters={starterSkills}
        max={8}
        onSuggest={(q) => openSuggest("skill", q)}
        placeholder="Type a skill and press Enter…"
      />

      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("passions")} disabled={!profile?.livelihood}>Continue</Button>
        <Button variant="secondary" onClick={() => next("passions")}>Not sure yet</Button>
      </div>
    </div>
  );

  const ScreenPassions = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Screen 4 — What you love (Passions)</h2>
      <p className="text-sm text-zinc-400">Pick a few you’d happily do for hours.</p>

      <ChipsTypeahead
        label="Passions"
        values={profile?.passions || []}
        setValues={(vals) => saveProfile({ passions: vals })}
        options={passions}
        starters={starterPassions}
        max={6}
        onSuggest={(q) => openSuggest("passion", q)}
        placeholder="Type a passion and press Enter…"
      />

      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("needs")}>Continue</Button>
        <Button variant="secondary" onClick={() => next("needs")}>Skip</Button>
      </div>
    </div>
  );

  const ScreenNeeds = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Screen 5 — What the world needs (Service)</h2>
      <p className="text-sm text-zinc-400">These guide future invitations.</p>

      <ChipsTypeahead
        label="Community Needs"
        values={profile?.needs || []}
        setValues={(vals) => saveProfile({ needs: vals })}
        options={needs}
        starters={starterNeeds}
        max={6}
        onSuggest={(q) => openSuggest("need", q)}
        placeholder="Type a need and press Enter…"
      />

      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("viability")}>Continue</Button>
        <Button variant="secondary" onClick={() => next("viability")}>Skip</Button>
      </div>
    </div>
  );

  const ScreenViability = (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">Screen 6 — Is this sustaining you?</h2>
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
        <Button onClick={() => next("story")} disabled={!profile?.viability}>Save & Continue</Button>
        <Button variant="secondary" onClick={() => next("story")}>Not sure yet</Button>
      </div>
    </div>
  );

  const ScreenStory = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Screen 7 — Your story</h2>
      <textarea
        placeholder="Share your journey, struggles, or hopes… (optional)"
        value={profile?.story || ""}
        onChange={(e) => saveProfile({ story: e.target.value })}
        className="w-full rounded-lg border border-white/20 bg-black/30 p-3 min-h-28"
      />
      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("vow")}>Continue</Button>
        <Button variant="secondary" onClick={() => next("vow")}>Skip</Button>
      </div>
    </div>
  );

  const ScreenVow = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Screen 8 — Vow</h2>
      <div className="grid grid-cols-2 gap-2">
        {[
          "Courage","Livelihood","Justice","Transparency","Solidarity","Servitude","Culture","Freedom",
        ].map((v) => (
          <button
            key={v}
            onClick={() => saveProfile({ vow: v })}
            className={`rounded-lg px-4 py-2 ${
              profile?.vow === v ? "bg-amber-400 text-black font-bold" : "bg-white/10 text-slate-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => next("reveal")} disabled={!profile?.vow}>Finish my profile</Button>
        <Button variant="secondary" onClick={() => next("reveal")}>Skip</Button>
      </div>
    </div>
  );

  const ScreenReveal = (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-bold">✨ Your circle is alive</h2>
      {profile?.photo_url && (
        <img
          src={profile.photo_url}
          alt="Profile"
          className="mx-auto h-24 w-24 rounded-full object-cover"
        />
      )}
      <p className="text-slate-300">
        Others can now sit closer, see your story, and walk with you.
      </p>
      <a
        href="/members"
        className="inline-block rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
      >
        Enter the Chauṭarī
      </a>
    </div>
  );

  const screens = {
    entry: ScreenEntry,
    name_face: ScreenNameFace,
    roots: ScreenRoots,
    livelihood: ScreenLivelihood,
    passions: ScreenPassions,
    needs: ScreenNeeds,
    viability: ScreenViability,
    story: ScreenStory,
    vow: ScreenVow,
    reveal: ScreenReveal,
  };

  return (
    <div className="min-h-[70vh] w-full px-5 py-8 md:py-10 bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={back}
            className="text-sm text-zinc-400 hover:text-zinc-200"
            aria-label="Back"
          >
            ← Back
          </button>
          <div className="text-xs text-zinc-400">
            Step {Math.max(0, steps.indexOf(step)) + 1} of {steps.length}
          </div>
        </div>

        {screens[step]}

        <div className="mt-10 flex items-center justify-between text-xs text-zinc-500">
          <div>Choices autosave. If offline, they’ll sync later.</div>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <span
                key={s}
                className={`inline-block h-2 w-2 rounded-full ${
                  i <= steps.indexOf(step) ? "bg-amber-500" : "bg-zinc-700"
                }`}
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
