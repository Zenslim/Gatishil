"use client";

/**
 * Gatishil — Digital Chauṭarī Onboarding (Screens 0–3)
 * ELI15: Uses your ONE shared Supabase client from ../lib/supabaseClient (we do NOT create a new one),
 * static-imports ChautariLocationPicker, and keeps Surname + Ikigai on Screen 3.
 * Fixes Vercel build error: removed accidental arrow function in JSX.
 */

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient"; // ✅ use existing singleton only
import ChautariLocationPicker from "./ChautariLocationPicker"; // ✅ static import

const STEP = {
  ENTRY: "entry",
  NAME_PHOTO: "name_photo",
  ROOTS: "roots",
  LIVELIHOOD_IKIGAI: "livelihood_ikigai",
};

const ringLimit = { skills: 8, passions: 6, needs: 6 };

const titleCase = (s) =>
  s?.toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (t) => t.toUpperCase()) || "";

const dedupePush = (list, value, max) => {
  const v = titleCase(value);
  if (!v) return list;
  const exists = list.some((x) => x.toLowerCase() === v.toLowerCase());
  const next = exists ? list : [...list, v];
  return max ? next.slice(0, max) : next;
};

// ——— DB helper: only allow columns that exist in your schema (incl. surname you added)
async function upsertProfileSafe(payload) {
  const allowed = [
    "user_id",
    "name",
    "surname",
    "photo_url",
    "roots_json",
    "diaspora_json",
    "livelihood",
    "skills",
    "passions",
    "needs",
    "viability",
    "transition_target",
    "updated_at",
  ];
  const clean = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase
    .from("profiles")
    .upsert(clean, { onConflict: "user_id", ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(STEP.ENTRY);
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Screen 1 — Name, Surname, Photo
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rawPhotoSrc, setRawPhotoSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState("");

  // Screen 2 — Roots
  const [roots, setRoots] = useState(null);

  // Screen 3 — Ikigai
  const [ikigaiTab, setIkigaiTab] = useState("Livelihood");
  const [livelihood, setLivelihood] = useState("");
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [viability, setViability] = useState("");
  const [transitionTarget, setTransitionTarget] = useState("");

  // --- Auth (ONE client): subscribe/unsubscribe using supabase-js v2 shape
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data?.user?.id ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Prefill existing profile (array-safe; no .single/.maybeSingle)
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "name, surname, photo_url, roots_json, diaspora_json, livelihood, skills, passions, needs, viability, transition_target"
        )
        .eq("user_id", userId);
      if (!error && Array.isArray(data) && data.length) {
        const row = data[0];
        setName(row.name || "");
        setSurname(row.surname || "");
        setPhotoUrl(row.photo_url || "");
        setRoots(row.roots_json || row.diaspora_json || null);
        setLivelihood(row.livelihood || "");
        setSkills(Array.isArray(row.skills) ? row.skills : []);
        setPassions(Array.isArray(row.passions) ? row.passions : []);
        setNeeds(Array.isArray(row.needs) ? row.needs : []);
        setViability(row.viability || "");
        setTransitionTarget(row.transition_target || "");
      }
    })();
  }, [userId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  // --- Photo helpers
  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const onCropComplete = (_area, pixels) => setCroppedAreaPixels(pixels);

  async function getCroppedCanvasBlob(imageSrc, cropPixels, outputSize = 512) {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    const { x, y, width, height } = cropPixels;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, x, y, width, height, 0, 0, outputSize, outputSize);
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92));
  }

  const confirmCropPreview = useCallback(async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return;
    const blob = await getCroppedCanvasBlob(rawPhotoSrc, croppedAreaPixels, 512);
    const url = URL.createObjectURL(blob);
    setCroppedPreview(url);
  }, [rawPhotoSrc, croppedAreaPixels]);

  // --- Saves
  const saveNameSurname = useCallback(async () => {
    if (!userId) return;
    try {
      await upsertProfileSafe({
        user_id: userId,
        name: name.trim() || null,
        surname: surname.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast("Saved.");
    } catch (e) {
      console.error(e);
      showToast("Save failed.");
    }
  }, [userId, name, surname]);

  const saveCroppedPhoto = useCallback(async () => {
    if (!userId || !croppedPreview) return;
    setBusy(true);
    try {
      const resp = await fetch(croppedPreview);
      const blob = await resp.blob();
      const path = `profiles/${userId}.jpg`; // matches your storage RLS

      await supabase.storage.from("profiles").remove([path]).catch(() => {});
      const { error: upErr } = await supabase
        .storage
        .from("profiles")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("profiles").getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) throw new Error("No public URL");

      await upsertProfileSafe({
        user_id: userId,
        name: name.trim() || null,
        surname: surname.trim() || null,
        photo_url: url,
        updated_at: new Date().toISOString(),
      });

      setPhotoUrl(url);
      showToast("Photo saved.");
    } catch (e) {
      console.error(e);
      showToast("Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }, [userId, croppedPreview, name, surname]);

  const saveRoots = useCallback(
    async (rootsObj) => {
      if (!userId) return;
      const payload = { user_id: userId, updated_at: new Date().toISOString() };
      if (rootsObj?.type === "ward") {
        payload.roots_json = rootsObj;
        payload.diaspora_json = null;
      } else if (rootsObj?.type === "city") {
        payload.diaspora_json = rootsObj;
        payload.roots_json = null;
      } else {
        payload.roots_json = null;
        payload.diaspora_json = null;
      }
      try {
        await upsertProfileSafe(payload);
        setRoots(rootsObj);
        showToast("Location saved.");
      } catch (e) {
        console.error(e);
        showToast("Could not save location.");
      }
    },
    [userId]
  );

  const saveIkigai = useCallback(async () => {
    if (!userId) return;
    try {
      await upsertProfileSafe({
        user_id: userId,
        livelihood: livelihood?.trim() || null,
        skills,
        passions,
        needs,
        viability: viability || null,
        transition_target: transitionTarget?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast("Saved.");
    } catch (e) {
      console.error(e);
      showToast("Save failed.");
    }
  }, [userId, livelihood, skills, passions, needs, viability, transitionTarget]);

  // --- Guards
  const screen1Ready = name.trim() && surname.trim() && (photoUrl || croppedPreview);
  const ikigaiReady =
    !!viability &&
    ((livelihood?.trim().length ?? 0) > 0 || skills.length > 0 || passions.length > 0 || needs.length > 0);

  // --- UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 backdrop-blur-xl space-y-6 border border-white/10">

        {/* Screen 0 — Entry */}
        {step === STEP.ENTRY && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">Others are already sitting under the tree. Let’s introduce yourself.</p>
            <button
              onClick={() => setStep(STEP.NAME_PHOTO)}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Begin my circle
            </button>
          </div>
        )}

        {/* Screen 1 — Name & Face */}
        {step === STEP.NAME_PHOTO && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Name & Face</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm opacity-80">Name (Given)</label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                  value={name}
                  placeholder="e.g., Nabin"
                  onChange={(e) => setName(titleCase(e.target.value))}
                  onBlur={saveNameSurname}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm opacity-80">Surname (Thar)</label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                  value={surname}
                  placeholder="e.g., Pradhan"
                  onChange={(e) => setSurname(titleCase(e.target.value))}
                  onBlur={saveNameSurname}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm opacity-80">Your Photo (round avatar)</label>

              {!rawPhotoSrc && !croppedPreview && !photoUrl && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const durl = await fileToDataURL(file);
                    setRawPhotoSrc(durl);
                    setCroppedPreview("");
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
                    <button
                      onClick={confirmCropPreview}
                      className="flex-1 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
                    >
                      Save crop preview
                    </button>
                    <button
                      onClick={() => {
                        setRawPhotoSrc("");
                        setCroppedPreview("");
                      }}
                      className="rounded-lg border border-white/20 px-4 py-2"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              )}

              {(croppedPreview || photoUrl) && (
                <div className="flex items-center gap-4">
                  <img
                    src={croppedPreview || photoUrl}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border border-white/10"
                  />
                  {croppedPreview && (
                    <button
                      className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold hover:bg-amber-500 disabled:opacity-50"
                      disabled={busy}
                      onClick={saveCroppedPhoto}
                    >
                      Upload & Save
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(STEP.ROOTS)}
              disabled={!screen1Ready}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
              title={!screen1Ready ? "Please add Name, Surname and Photo" : ""}
            >
              Continue
            </button>
          </div>
        )}

        {/* Screen 2 — Roots */}
        {step === STEP.ROOTS && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>

            <ChautariLocationPicker
              value={roots}
              onChange={async (v) => {
                setRoots(v);
                await saveRoots(v);
              }}
            />

            {roots?.label && <p className="text-sm text-slate-300">Selected: {roots.label}</p>}

            <button
              onClick={() => setStep(STEP.LIVELIHOOD_IKIGAI)}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Screen 3 — Livelihood & Ikigai */}
        {step === STEP.LIVELIHOOD_IKIGAI && (
          <IkigaiScreen
            ikigaiTab={ikigaiTab}
            setIkigaiTab={setIkigaiTab}
            livelihood={livelihood}
            setLivelihood={setLivelihood}
            skills={skills}
            setSkills={setSkills}
            passions={passions}
            setPassions={setPassions}
            needs={needs}
            setNeeds={setNeeds}
            viability={viability}
            setViability={setViability}
            transitionTarget={transitionTarget}
            setTransitionTarget={setTransitionTarget}
            ready={ikigaiReady}
            busy={busy}
            onSave={saveIkigai}
          />
        )}

        {/* Toast */}
        {toast && <div className="text-center text-sm text-slate-200">{toast}</div>}
      </div>
    </div>
  );
}

function IkigaiScreen({
  ikigaiTab,
  setIkigaiTab,
  livelihood,
  setLivelihood,
  skills,
  setSkills,
  passions,
  setPassions,
  needs,
  setNeeds,
  viability,
  setViability,
  transitionTarget,
  setTransitionTarget,
  ready,
  busy,
  onSave,
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Let’s understand your work & gifts.</h2>

      <div className="flex gap-2 flex-wrap">
        {["Livelihood", "Good At", "Love", "World Needs", "Sustainability"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setIkigaiTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              ikigaiTab === t ? "bg-amber-400 text-black border-amber-400" : "border-white/20 hover:border-amber-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {ikigaiTab === "Livelihood" && (
        <div className="space-y-3">
          <label className="block text-sm opacity-80">What work do your hands and mind do?</label>
          <input
            className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            placeholder="Farmer, Teacher, Software Developer…"
            value={livelihood}
            onChange={(e) => setLivelihood(titleCase(e.target.value))}
          />
          <div className="flex gap-2 flex-wrap text-xs opacity-80">
            {["Farmer","Teacher","Software Developer","Driver","Tailor","Nurse","Shopkeeper","Carpenter"].map((s) => (
              <button
                key={s}
                type="button"
                className="px-2 py-1 rounded-full bg-white/10 border border-white/15 hover:border-amber-400"
                onClick={() => setLivelihood(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {ikigaiTab === "Good At" && (
        <ChipsInput
          id="skills"
          label="What are you reliably good at?"
          items={skills}
          setItems={(v) => setSkills(v.slice(0, ringLimit.skills))}
          placeholder="Add a skill… (Enter)"
          max={ringLimit.skills}
        />
      )}

      {ikigaiTab === "Love" && (
        <ChipsInput
          id="passions"
          label="What makes you feel alive lately?"
          items={passions}
          setItems={(v) => setPassions(v.slice(0, ringLimit.passions))}
          placeholder="Add a passion… (Enter)"
          max={ringLimit.passions}
        />
      )}

      {ikigaiTab === "World Needs" && (
        <ChipsInput
          id="needs"
          label="What needs around you pull your heart?"
          items={needs}
          setItems={(v) => setNeeds(v.slice(0, ringLimit.needs))}
          placeholder="Add a community need… (Enter)"
          max={ringLimit.needs}
        />
      )}

      {ikigaiTab === "Sustainability" && (
        <div className="space-y-3">
          <label className="block text-sm opacity-80">Is this sustaining you right now? (required)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: "paid", label: "Paid & stable" },
              { key: "part_time", label: "Part-time / side" },
              { key: "learning", label: "Learning / intern / volunteer" },
              { key: "exploring", label: "Exploring a shift" },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                className={`px-3 py-2 rounded-lg border ${
                  viability === o.key ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15 hover:border-amber-400"
                }`}
                onClick={() => setViability(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {(viability === "learning" || viability === "exploring") && (
            <div className="space-y-2">
              <label className="block text-sm opacity-80">Transition toward… (optional)</label>
              <input
                className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                placeholder="Type a target livelihood"
                value={transitionTarget}
                onChange={(e) => setTransitionTarget(titleCase(e.target.value))}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          className={`px-4 py-2 rounded-lg ${
            ready ? "bg-amber-400 text-black hover:bg-amber-500" : "bg-white/10 text-white/60 cursor-not-allowed"
          }`}
          disabled={!ready || busy}
          onClick={onSave}
        >
          Save
        </button>
        <span className="self-center text-xs opacity-70">Screens 4–9 later.</span>
      </div>
    </div>
  );
}

/* Chips input helper */
function ChipsInput({ id, label, items, setItems, placeholder, max = 8 }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>{label}</label>
      <div className="flex gap-2 flex-wrap">
        {items.map((it) => (
          <span key={it} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/15">
            {it}{" "}
            <button
              type="button"
              onClick={() => setItems(items.filter((x) => x !== it))}
              className="opacity-70 hover:opacity-100 ml-1"
              aria-label={`Remove ${it}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!value.trim()) return;
            const v = titleCase(value);
            const exists = items.some((x) => x.toLowerCase() === v.toLowerCase());
            const next = exists ? items : [...items, v];
            setItems(next.slice(0, max));
            setValue("");
          } else if (e.key === "Backspace" && !value && items.length) {
            setItems(items.slice(0, -1));
          }
        }}
      />
      <div className="text-xs opacity-60">{items.length}/{max} • Press Enter to add</div>
    </div>
  );
}
