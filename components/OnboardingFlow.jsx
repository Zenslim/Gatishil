"use client";

/**
 * Gatishil — Digital Chauṭarī Onboarding (Screens 0–3, REST-only)
 *
 * ELI15:
 * - We DO NOT import or create any Supabase client (so no “Multiple GoTrueClient instances” warnings).
 * - We call Supabase REST endpoints directly with your current session token from localStorage.
 * - We keep Screen 1 (Name + Surname + Photo), Screen 2 (Roots — simplified input), Screen 3 (Ikigai tabs).
 * - Writes exactly your schema columns (incl. surname).
 * - Storage upload uses REST and x-upsert; public URL comes from /storage/v1/object/public/...
 *
 * Remote-only: GitHub + Vercel + Supabase.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";

// ---------- ENV (provided by Vercel) ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;          // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;    // anon key (for apikey header)

// ---------- Session helpers (NO supabase client) ----------
function findSupabaseSession() {
  if (typeof window === "undefined") return null;
  try {
    // Look for any key that matches Supabase v2 pattern sb-*-auth-token, or a custom key if present
    const keys = Object.keys(localStorage);
    const authKey =
      keys.find((k) => /^sb-.*-auth-token$/.test(k)) ||
      keys.find((k) => k.includes("auth") && k.includes("token")) ||
      null;
    if (!authKey) return null;
    const raw = localStorage.getItem(authKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // supabase-js v2 stores { currentSession, expiresAt, ... } OR { access_token, user } in different shapes
    // normalize:
    const sess = parsed?.currentSession || parsed?.session || parsed;
    const access_token = sess?.access_token || parsed?.access_token || null;
    const user = sess?.user || parsed?.user || null;
    const user_id = user?.id || null;
    return access_token ? { access_token, user_id } : null;
  } catch {
    return null;
  }
}

async function restGet(path, { token, params } = {}) {
  const url = new URL(`${SUPABASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return await res.json();
}

async function restUpsert(table, rows, { token } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const tx = await res.text().catch(() => "");
    throw new Error(`UPSERT ${table} ${res.status} ${tx}`);
  }
  return await res.json();
}

async function restSelect(table, { token, query } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  // default: select full row, filter will be applied by caller
  url.searchParams.set("select", "*");
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SELECT ${table} ${res.status}`);
  return await res.json();
}

async function uploadPublicProfilePhoto({ token, user_id, blob }) {
  // REST storage upload (public bucket 'profiles'); path: profiles/<uid>.jpg
  const path = `profiles/${user_id}.jpg`;
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${token}`,
      "x-upsert": "true",
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
    body: blob,
  });
  if (!res.ok) {
    const tx = await res.text().catch(() => "");
    throw new Error(`UPLOAD storage ${res.status} ${tx}`);
  }
  // public URL (bucket is public by your SQL): /storage/v1/object/public/profiles/<uid>.jpg
  return `${SUPABASE_URL}/storage/v1/object/public/profiles/${user_id}.jpg`;
}

// ---------- small utils ----------
const titleCase = (s) =>
  s?.toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (t) => t.toUpperCase()) || "";

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

export default function OnboardingFlow() {
  // session (token + user_id) — read once, no listeners, no client
  const [{ token, user_id }, setSession] = useState({ token: null, user_id: null });

  useEffect(() => {
    const sess = findSupabaseSession();
    if (sess?.access_token && sess?.user_id) setSession({ token: sess.access_token, user_id: sess.user_id });
  }, []);

  const [step, setStep] = useState("entry");
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

  // Screen 2 — Roots (simplified input to avoid any import issues)
  const [rootsType, setRootsType] = useState("ward"); // 'ward' | 'city'
  const [rootsLabel, setRootsLabel] = useState("");

  // Screen 3 — Ikigai
  const [ikigaiTab, setIkigaiTab] = useState("Livelihood");
  const [livelihood, setLivelihood] = useState("");
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [viability, setViability] = useState("");
  const [transitionTarget, setTransitionTarget] = useState("");

  const screen1Ready = name.trim() && surname.trim() && (photoUrl || croppedPreview);
  const ikigaiReady =
    !!viability &&
    ((livelihood?.trim().length ?? 0) > 0 || skills.length > 0 || passions.length > 0 || needs.length > 0);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1600); };

  // ------- Prefill profile via REST
  useEffect(() => {
    (async () => {
      if (!token || !user_id) return;
      try {
        const rows = await restSelect("profiles", {
          token,
          query: { user_id: `eq.${user_id}` },
        });
        if (Array.isArray(rows) && rows.length) {
          const r = rows[0];
          setName(r.name || "");
          setSurname(r.surname || "");
          setPhotoUrl(r.photo_url || "");
          // try to show something user-friendly for roots
          const rlabel = r?.roots_json?.label || r?.diaspora_json?.label || "";
          const rtype = r?.roots_json ? "ward" : r?.diaspora_json ? "city" : "ward";
          setRootsType(rtype);
          setRootsLabel(rlabel);
          setLivelihood(r.livelihood || "");
          setSkills(Array.isArray(r.skills) ? r.skills : []);
          setPassions(Array.isArray(r.passions) ? r.passions : []);
          setNeeds(Array.isArray(r.needs) ? r.needs : []);
          setViability(r.viability || "");
          setTransitionTarget(r.transition_target || "");
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token, user_id]);

  // ------- Photo helpers
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

  // ------- Saves (REST)

  const saveNameSurname = useCallback(async () => {
    if (!token || !user_id) return;
    try {
      await restUpsert("profiles", {
        user_id,
        name: name.trim() || null,
        surname: surname.trim() || null,
        updated_at: new Date().toISOString(),
      }, { token });
      showToast("Saved.");
    } catch (e) {
      console.error(e);
      showToast("Save failed.");
    }
  }, [token, user_id, name, surname]);

  const saveCroppedPhoto = useCallback(async () => {
    if (!token || !user_id || !croppedPreview) return;
    setBusy(true);
    try {
      const resp = await fetch(croppedPreview);
      const blob = await resp.blob();

      const publicUrl = await uploadPublicProfilePhoto({ token, user_id, blob });

      await restUpsert("profiles", {
        user_id,
        name: name.trim() || null,
        surname: surname.trim() || null,
        photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      }, { token });

      setPhotoUrl(publicUrl);
      showToast("Photo saved.");
    } catch (e) {
      console.error(e);
      showToast("Photo upload failed.");
    } finally {
      setBusy(false);
    }
  }, [token, user_id, croppedPreview, name, surname]);

  const saveRoots = useCallback(async () => {
    if (!token || !user_id) return;
    const label = rootsLabel.trim();
    const payload = { user_id, updated_at: new Date().toISOString() };
    if (rootsType === "ward") {
      payload.roots_json = { type: "ward", label };
      payload.diaspora_json = null;
    } else {
      payload.diaspora_json = { type: "city", label };
      payload.roots_json = null;
    }
    try {
      await restUpsert("profiles", payload, { token });
      showToast("Location saved.");
    } catch (e) {
      console.error(e);
      showToast("Could not save location.");
    }
  }, [token, user_id, rootsType, rootsLabel]);

  const saveIkigai = useCallback(async () => {
    if (!token || !user_id) return;
    try {
      await restUpsert("profiles", {
        user_id,
        livelihood: livelihood?.trim() || null,
        skills,
        passions,
        needs,
        viability: viability || null,
        transition_target: transitionTarget?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { token });
      showToast("Saved.");
    } catch (e) {
      console.error(e);
      showToast("Save failed.");
    }
  }, [token, user_id, livelihood, skills, passions, needs, viability, transitionTarget]);

  // ------- UI

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 backdrop-blur-xl space-y-6 border border-white/10">

        {/* Screen 0 — Entry */}
        {step === "entry" && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">Others are already sitting under the tree. Let’s introduce yourself.</p>
            <button
              onClick={() => setStep("name_photo")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Begin my circle
            </button>
          </div>
        )}

        {/* Screen 1 — Name & Face (both required incl. Surname) */}
        {step === "name_photo" && (
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
                      onCropComplete={(_, px) => setCroppedAreaPixels(px)}
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
              onClick={() => setStep("roots")}
              disabled={!screen1Ready}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
              title={!screen1Ready ? "Please add Name, Surname and Photo" : ""}
            >
              Continue
            </button>
          </div>
        )}

        {/* Screen 2 — Roots (simplified text input; saves to roots_json or diaspora_json) */}
        {step === "roots" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>

            <div className="flex gap-3">
              <label className={`px-3 py-1.5 rounded-lg border cursor-pointer ${rootsType === "ward" ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15"}`}>
                <input type="radio" name="rootsType" className="hidden" checked={rootsType === "ward"} onChange={() => setRootsType("ward")} />
                Ward (Nepal)
              </label>
              <label className={`px-3 py-1.5 rounded-lg border cursor-pointer ${rootsType === "city" ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15"}`}>
                <input type="radio" name="rootsType" className="hidden" checked={rootsType === "city"} onChange={() => setRootsType("city")} />
                City (Abroad)
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm opacity-80">Write the place name</label>
              <input
                className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                placeholder={rootsType === "ward" ? "Your Ward / Local Level" : "Your City, Country"}
                value={rootsLabel}
                onChange={(e) => setRootsLabel(e.target.value)}
                onBlur={saveRoots}
              />
              <div className="text-xs opacity-60">We’ll plug in the full picker later.</div>
            </div>

            <button
              onClick={() => setStep("livelihood_ikigai")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Screen 3 — Livelihood & Ikigai */}
        {step === "livelihood_ikigai" && (
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

        {/* Session guard */}
        {!token && (
          <div className="text-xs text-amber-300">
            Note: not signed in — login to enable saving (we reuse your existing session automatically).
          </div>
        )}
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
  const ringLimit = { skills: 8, passions: 6, needs: 6 };

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
