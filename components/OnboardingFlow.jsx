"use client";

/**
 * Gatishil — Digital Chauṭarī Onboarding (Screens 0–3, with full Screen 2 Roots picker)
 *
 * Screen 2 (this commit):
 * - Nepal path: Province → District → Palika (Nagar/Gaun) → Ward → Tole (add-if-missing)
 * - Diaspora toggle: Country → City (add-if-missing)
 * - Progressive reveal, searchable dropdowns, keyboard-friendly
 * - Live summary text, strict validation (must reach Ward OR City)
 * - Saves via Supabase REST only (no client instances → no GoTrue warning)
 *
 * Remote-only: GitHub + Vercel + Supabase. One file, drop-in.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";

// ---------- ENV ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------- Session (no supabase-js) ----------
function findSupabaseSession() {
  if (typeof window === "undefined") return null;
  try {
    const keys = Object.keys(localStorage);
    const authKey =
      keys.find((k) => /^sb-.*-auth-token$/.test(k)) ||
      keys.find((k) => k.includes("auth") && k.includes("token")) ||
      null;
    if (!authKey) return null;
    const raw = localStorage.getItem(authKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sess = parsed?.currentSession || parsed?.session || parsed;
    const access_token = sess?.access_token || parsed?.access_token || null;
    const user = sess?.user || parsed?.user || null;
    const user_id = user?.id || null;
    return access_token ? { access_token, user_id } : null;
  } catch {
    return null;
  }
}

async function restSelect(table, { token, query, select = "*" } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SELECT ${table} ${res.status}`);
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

async function uploadPublicProfilePhoto({ token, user_id, blob }) {
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
  return `${SUPABASE_URL}/storage/v1/object/public/profiles/${user_id}.jpg`;
}

// ---------- small utils ----------
const titleCase = (s) =>
  s?.toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (t) => t.toUpperCase()) || "";

function useSession() {
  const [session, setSession] = useState({ token: null, user_id: null });
  useEffect(() => {
    const sess = findSupabaseSession();
    if (sess?.access_token && sess?.user_id) setSession({ token: sess.access_token, user_id: sess.user_id });
  }, []);
  return session;
}

// ---------- generic searchable dropdown ----------
function SearchSelect({ label, placeholder, value, onChange, fetcher, disabled, required, id }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open) return;
      try {
        const out = await fetcher(q);
        if (alive) setItems(out || []);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => { alive = false; };
  }, [q, open, fetcher]);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="space-y-1" ref={boxRef}>
      <label className="block text-sm opacity-80">{label}</label>
      <div className={`relative`}>
        <input
          id={id}
          className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
          placeholder={placeholder}
          value={value?.label || ""}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(null); // typing clears selection
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          aria-required={required ? "true" : "false"}
        />
        {open && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/15 bg-black/90 p-1">
            {items.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
            )}
            {items.map((it) => (
              <button
                key={it.id || it.value || it.label}
                type="button"
                className="w-full text-left px-3 py-2 rounded hover:bg-white/10"
                onClick={() => { onChange(it); setOpen(false); setQ(""); }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Onboarding ----------
export default function OnboardingFlow() {
  const { token, user_id } = useSession();

  const [step, setStep] = useState("entry");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Screen 1
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rawPhotoSrc, setRawPhotoSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState("");

  // Screen 2 — Roots (full)
  const [abroad, setAbroad] = useState(false);

  const [province, setProvince] = useState(null);
  const [district, setDistrict] = useState(null);
  const [palika, setPalika] = useState(null);
  const [ward, setWard] = useState(null);
  const [tole, setTole] = useState("");

  const [country, setCountry] = useState(null);
  const [city, setCity] = useState("");

  // Screen 3 — Ikigai
  const [ikigaiTab, setIkigaiTab] = useState("Livelihood");
  const [livelihood, setLivelihood] = useState("");
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [viability, setViability] = useState("");
  const [transitionTarget, setTransitionTarget] = useState("");

  // Prefill profile
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
          // roots
          if (r.roots_json) {
            setAbroad(false);
            const rj = r.roots_json;
            setProvince(rj.province || null);
            setDistrict(rj.district || null);
            setPalika(rj.palika || null);
            setWard(rj.ward || null);
            setTole(rj.tole || "");
          } else if (r.diaspora_json) {
            setAbroad(true);
            const dj = r.diaspora_json;
            setCountry(dj.country || null);
            setCity(dj.city || "");
          }
          // ikigai
          setLivelihood(r.livelihood || "");
          setSkills(Array.isArray(r.skills) ? r.skills : []);
          setPassions(Array.isArray(r.passions) ? r.passions : []);
          setNeeds(Array.isArray(r.needs) ? r.needs : []);
          setViability(r.viability || "");
          setTransitionTarget(r.transition_target || "");
        }
      } catch {}
    })();
  }, [token, user_id]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1600); };

  // ---------- photo
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
  const onCropComplete = (_a, px) => setCroppedAreaPixels(px);
  const confirmCropPreview = useCallback(async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return;
    const blob = await getCroppedCanvasBlob(rawPhotoSrc, croppedAreaPixels, 512);
    const url = URL.createObjectURL(blob);
    setCroppedPreview(url);
  }, [rawPhotoSrc, croppedAreaPixels]);

  // ---------- saves
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
    } catch { showToast("Save failed."); }
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
    } catch { showToast("Photo upload failed."); } finally { setBusy(false); }
  }, [token, user_id, croppedPreview, name, surname]);

  const nepalValid = !!(province && district && palika && ward);
  const abroadValid = !!(country && city.trim());

  const summary = useMemo(() => {
    if (!abroad && nepalValid) {
      return [
        province?.label, district?.label, palika?.label,
        ward?.label || (ward?.ward_no ? `Ward ${ward.ward_no}` : null),
        tole?.trim() ? tole.trim() : null
      ].filter(Boolean).join(" / ");
    }
    if (abroad && abroadValid) {
      return [country?.label, city.trim()].filter(Boolean).join(" / ");
    }
    return "";
  }, [abroad, nepalValid, province, district, palika, ward, tole, abroadValid, country, city]);

  const saveRoots = useCallback(async () => {
    if (!token || !user_id) return;
    const payload = { user_id, updated_at: new Date().toISOString() };
    if (!abroad && nepalValid) {
      payload.roots_json = {
        type: "ward",
        province, district, palika, ward,
        tole: tole?.trim() || null,
        label: summary,
      };
      payload.diaspora_json = null;
    } else if (abroad && abroadValid) {
      payload.diaspora_json = {
        type: "city",
        country, city: city.trim(),
        label: summary,
      };
      payload.roots_json = null;
    } else {
      return; // not valid yet
    }
    try { await restUpsert("profiles", payload, { token }); showToast("Location saved."); }
    catch { showToast("Could not save location."); }
  }, [token, user_id, abroad, nepalValid, province, district, palika, ward, tole, abroadValid, country, city, summary]);

  const saveIkigai = useCallback(async () => {
    if (!token || !user_id) return;
    try {
      await restUpsert("profiles", {
        user_id,
        livelihood: livelihood?.trim() || null,
        skills, passions, needs,
        viability: viability || null,
        transition_target: transitionTarget?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { token });
      showToast("Saved.");
    } catch { showToast("Save failed."); }
  }, [token, user_id, livelihood, skills, passions, needs, viability, transitionTarget]);

  // ---------- data fetchers (wire to your endpoints; fall back to empty arrays if not available)
  const api = {
    provinces: async (q) => {
      // Replace with your real endpoint or REST view, e.g. /rest/v1/provinces?label=ilike.%25q%25
      // For now return a minimal list to stay functional.
      const base = [
        { id: "bagmati", label: "Bagmati" },
        { id: "gandaki", label: "Gandaki" },
        { id: "koshi", label: "Koshi" },
        { id: "lumbini", label: "Lumbini" },
        { id: "madhesh", label: "Madhesh" },
        { id: "karnali", label: "Karnali" },
        { id: "sudurpaschim", label: "Sudurpashchim" },
      ];
      return base.filter((x) => !q || x.label.toLowerCase().includes(q.toLowerCase()));
    },
    districts: async (provinceId, q) => {
      // TODO: hook to your districts source; filtered by provinceId
      return q ? [{ id: "kathmandu", label: "Kathmandu" }].filter(x => x.label.toLowerCase().includes(q.toLowerCase())) : [{ id: "kathmandu", label: "Kathmandu" }];
    },
    palikas: async (districtId, q) => {
      return q ? [{ id: "ktm-metro", label: "Kathmandu Metropolitan City" }].filter(x => x.label.toLowerCase().includes(q.toLowerCase())) : [{ id: "ktm-metro", label: "Kathmandu Metropolitan City" }];
    },
    wards: async (palikaId, q) => {
      const list = Array.from({ length: 32 }).map((_, i) => ({ id: `ward-${i+1}`, label: `Ward ${i+1}`, ward_no: i+1 }));
      return list.filter((x) => !q || x.label.toLowerCase().includes(q.toLowerCase()));
    },
    countries: async (q) => {
      const base = ["India","Qatar","United Arab Emirates","United Kingdom","United States","Japan","Australia","Malaysia","Saudi Arabia","South Korea"]
        .map((l) => ({ id: l.toLowerCase().replace(/\s+/g,"-"), label: l }));
      return base.filter((x) => !q || x.label.toLowerCase().includes(q.toLowerCase()));
    },
    cities: async (_countryId, q) => {
      const base = ["Doha","Dubai","Abu Dhabi","Delhi","London","New York","Tokyo","Sydney","Kuala Lumpur","Riyadh","Seoul"]
        .map((l) => ({ id: l.toLowerCase().replace(/\s+/g,"-"), label: l }));
      return base.filter((x) => !q || x.label.toLowerCase().includes(q.toLowerCase()));
    },
  };

  // ---------- UI
  const screen1Ready = name.trim() && surname.trim() && (photoUrl || croppedPreview);
  const ikigaiReady =
    !!viability &&
    ((livelihood?.trim().length ?? 0) > 0 || skills.length > 0 || passions.length > 0 || needs.length > 0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 backdrop-blur-xl space-y-6 border border-white/10">

        {/* Screen 0 — Entry */}
        {step === "entry" && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">Others are already sitting under the tree. Let’s introduce yourself.</p>
            <button onClick={() => setStep("name_photo")} className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black">
              Begin my circle
            </button>
          </div>
        )}

        {/* Screen 1 — Name & Face */}
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
                  type="file" accept="image/*"
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
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
                  <div className="flex gap-2">
                    <button onClick={confirmCropPreview} className="flex-1 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black">Save crop preview</button>
                    <button onClick={() => { setRawPhotoSrc(""); setCroppedPreview(""); }} className="rounded-lg border border-white/20 px-4 py-2">Choose another</button>
                  </div>
                </div>
              )}

              {(croppedPreview || photoUrl) && (
                <div className="flex items-center gap-4">
                  <img src={croppedPreview || photoUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover border border-white/10" />
                  {croppedPreview && (
                    <button className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold hover:bg-amber-500 disabled:opacity-50" disabled={busy} onClick={saveCroppedPhoto}>
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

        {/* Screen 2 — Roots */}
        {step === "roots" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>

            {/* Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg border ${!abroad ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15"}`}
                onClick={() => {
                  setAbroad(false);
                  // clear diaspora
                  setCountry(null); setCity("");
                }}
              >
                Ward (Nepal)
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg border ${abroad ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15"}`}
                onClick={() => {
                  setAbroad(true);
                  // clear Nepal chain
                  setProvince(null); setDistrict(null); setPalika(null); setWard(null); setTole("");
                }}
              >
                City (Abroad)
              </button>
            </div>

            {/* Nepal path */}
            {!abroad && (
              <div className="space-y-3">
                <SearchSelect
                  id="province" label="Province" placeholder="Select province"
                  value={province} onChange={(v) => { setProvince(v); setDistrict(null); setPalika(null); setWard(null); }}
                  fetcher={(q) => api.provinces(q)} required
                />

                {province && (
                  <SearchSelect
                    id="district" label="District" placeholder="Select district"
                    value={district} onChange={(v) => { setDistrict(v); setPalika(null); setWard(null); }}
                    fetcher={(q) => api.districts(province?.id, q)} required
                  />
                )}

                {district && (
                  <SearchSelect
                    id="palika" label="Palika (Nagar/Gaun)" placeholder="Select palika"
                    value={palika} onChange={(v) => { setPalika(v); setWard(null); }}
                    fetcher={(q) => api.palikas(district?.id, q)} required
                  />
                )}

                {palika && (
                  <SearchSelect
                    id="ward" label="Ward" placeholder="Select ward"
                    value={ward} onChange={(v) => setWard(v)}
                    fetcher={(q) => api.wards(palika?.id, q)} required
                  />
                )}

                {ward && (
                  <div className="space-y-1">
                    <label className="block text-sm opacity-80">Tole (optional) — add if missing</label>
                    <input
                      className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                      placeholder="Type your Tole (optional)"
                      value={tole}
                      onChange={(e) => setTole(titleCase(e.target.value))}
                    />
                    <div className="text-xs opacity-60">We’ll submit “add if missing” for review in a later patch.</div>
                  </div>
                )}

                {/* Summary */}
                {(province || district || palika || ward || tole) && (
                  <p className="text-sm text-slate-300">
                    Summary: {[province?.label, district?.label, palika?.label, ward?.label, tole?.trim() || null].filter(Boolean).join(" / ")}
                  </p>
                )}
              </div>
            )}

            {/* Diaspora path */}
            {abroad && (
              <div className="space-y-3">
                <SearchSelect
                  id="country" label="Country" placeholder="Select country"
                  value={country} onChange={(v) => { setCountry(v); setCity(""); }}
                  fetcher={(q) => api.countries(q)} required
                />

                {country && (
                  <div className="space-y-1">
                    <label className="block text-sm opacity-80">City (add if missing)</label>
                    <div className="grid grid-cols-1 gap-2">
                      <SearchSelect
                        id="citySelect"
                        label="Pick from common cities"
                        placeholder="Search city"
                        value={city ? { id: city.toLowerCase(), label: city } : null}
                        onChange={(v) => setCity(v?.label || "")}
                        fetcher={(q) => api.cities(country?.id, q)}
                      />
                      <input
                        className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
                        placeholder="Or type your city name"
                        value={city}
                        onChange={(e) => setCity(titleCase(e.target.value))}
                      />
                    </div>
                    <div className="text-xs opacity-60">If your city isn’t listed, just type it above — we’ll review and add it.</div>
                  </div>
                )}

                {(country || city) && (
                  <p className="text-sm text-slate-300">Summary: {[country?.label, city?.trim() || null].filter(Boolean).join(" / ")}</p>
                )}
              </div>
            )}

            <button
              onClick={async () => { await saveRoots(); setStep("livelihood_ikigai"); }}
              disabled={(!abroad && !nepalValid) || (abroad && !abroadValid)}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
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
            key={t} type="button" onClick={() => setIkigaiTab(t)}
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
              <button key={s} type="button" className="px-2 py-1 rounded-full bg-white/10 border border-white/15 hover:border-amber-400" onClick={() => setLivelihood(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {ikigaiTab === "Good At" && (
        <ChipsInput
          id="skills" label="What are you reliably good at?"
          items={skills} setItems={(v) => setSkills(v.slice(0, ringLimit.skills))}
          placeholder="Add a skill… (Enter)" max={ringLimit.skills}
        />
      )}

      {ikigaiTab === "Love" && (
        <ChipsInput
          id="passions" label="What makes you feel alive lately?"
          items={passions} setItems={(v) => setPassions(v.slice(0, ringLimit.passions))}
          placeholder="Add a passion… (Enter)" max={ringLimit.passions}
        />
      )}

      {ikigaiTab === "World Needs" && (
        <ChipsInput
          id="needs" label="What needs around you pull your heart?"
          items={needs} setItems={(v) => setNeeds(v.slice(0, ringLimit.needs))}
          placeholder="Add a community need… (Enter)" max={ringLimit.needs}
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
                key={o.key} type="button"
                className={`px-3 py-2 rounded-lg border ${viability === o.key ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 border-white/15 hover:border-amber-400"}`}
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
          className={`px-4 py-2 rounded-lg ${ready ? "bg-amber-400 text-black hover:bg-amber-500" : "bg-white/10 text-white/60 cursor-not-allowed"}`}
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

function ChipsInput({ id, label, items, setItems, placeholder, max = 8 }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>{label}</label>
      <div className="flex gap-2 flex-wrap">
        {items.map((it) => (
          <span key={it} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/15">
            {it}{" "}
            <button type="button" onClick={() => setItems(items.filter((x) => x !== it))} className="opacity-70 hover:opacity-100 ml-1" aria-label={`Remove ${it}`}>
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
