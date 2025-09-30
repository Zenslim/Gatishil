"use client";

/**
 * Gatishil — Digital Chauṭarī Onboarding (Roots JSON integration)
 * Remote-only stack: Next.js + Supabase + Vercel
 *
 * What’s new:
 * - Roots step uses <ChautariLocationPicker/>
 * - Saves full ward/city object into profiles.roots_json / diaspora_json (JSONB)
 * - Keeps legacy text columns (roots/diaspora) for human-readable labels
 * - Photo is mandatory with circle crop → uploads to Supabase Storage
 *
 * Requires:
 *   npm i @supabase/supabase-js react-easy-crop
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (Vercel env)
 *   Storage bucket "profiles" (public) in Supabase
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { createClient } from "@supabase/supabase-js";
import ChautariLocationPicker from "./ChautariLocationPicker";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const steps = [
  "entry",
  "name_photo",
  "roots",
  "livelihood",
  "circles",
  "family",
  "solidarity",
  "story",
  "vow",
  "reveal",
];

export default function OnboardingFlow() {
  const [step, setStep] = useState("entry");
  const [userId, setUserId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    photoUrlFinal: "",
    // roots now stores the normalized selection object from the picker
    roots: null,        // { type:'ward'|'city', id, label, ... }
    diaspora_obj: null, // reserved if you want a separate diaspora-only flow
    diaspora_text: "",  // human label if abroad
    livelihood: "",
    skills: [],
    circles: [],
    family: "",
    offer: [],
    needs: [],
    story: "",
    vow: "",
  });

  // Photo state
  const [rawPhotoSrc, setRawPhotoSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState("");
  const [cropping, setCropping] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) setUserId(data.user.id);
    })();
  }, []);

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
    ctx.drawImage(image, x, y, width, height, 0, 0, outputSize, outputSize);
    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.8)
    );
  }

  const confirmCrop = useCallback(async () => {
    if (!rawPhotoSrc || !croppedAreaPixels) return;
    try {
      setCropping(true);
      const blob = await getCroppedCanvasBlob(rawPhotoSrc, croppedAreaPixels, 512);
      const previewUrl = URL.createObjectURL(blob);
      setCroppedPreview(previewUrl);
    } finally {
      setCropping(false);
    }
  }, [rawPhotoSrc, croppedAreaPixels]);

  const next = (s) => setStep(s);

  async function uploadPhotoAndSaveProfile() {
    if (!userId) {
      alert("Authentication required. Please rejoin/login.");
      return;
    }
    if (!croppedPreview) {
      alert("Please upload and crop your photo.");
      return;
    }
    // Validate roots selection
    if (!form.roots || !form.roots.label) {
      alert("Please select your Ward/City in Roots.");
      setStep("roots");
      return;
    }

    setUploading(true);
    try {
      // upload photo
      const resp = await fetch(croppedPreview);
      const blob = await resp.blob();
      const path = `photos/${userId}/profile.webp`;
      await supabase.storage.from("profiles").remove([path]).catch(() => {});
      const { error: upErr } = await supabase.storage
        .from("profiles")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(path);

      // build roots json
      const rootsJson =
        form.roots?.type === "ward"
          ? {
              type: "ward",
              ward_id: form.roots.id,
              ward_no: form.roots.ward_no ?? null,
              local_level_id: form.roots.local_level_id ?? null,
              district_id: form.roots.district_id ?? null,
              province_id: form.roots.province_id ?? null,
              label: form.roots.label,
            }
          : form.roots?.type === "city"
          ? {
              type: "city",
              city_id: form.roots.city_id ?? form.roots.id,
              country_code: form.roots.country_code ?? null,
              label: form.roots.label,
            }
          : null;

      // optional: separate diaspora_json if you want to keep local vs abroad distinct
      const diasporaJson = rootsJson?.type === "city" ? rootsJson : null;

      const payload = {
       user_id: userId,
name: form.name || null,
photo_url: publicUrl,
// legacy text labels for quick reads
roots: rootsJson?.type === "ward" ? rootsJson.label : null,
diaspora: rootsJson?.type === "city" ? rootsJson.label : null,
// jsonb columns for querying
roots_json: rootsJson || null,
        diaspora_json: diasporaJson,
        livelihood: form.livelihood || null,
        skills: form.skills?.length ? form.skills : null,
        circles: form.circles?.length ? form.circles : null,
        family: form.family || null,
        offer: form.offer?.length ? form.offer : null,
        needs: form.needs?.length ? form.needs : null,
        story: form.story || null,
        vow: form.vow || null,
        updated_at: new Date().toISOString(),
      };

      // upsert
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (dbErr) throw dbErr;

      setForm((f) => ({ ...f, photoUrlFinal: publicUrl }));
      return publicUrl;
    } finally {
      setUploading(false);
    }
  }

  async function finishAndReveal() {
    const url = await uploadPhotoAndSaveProfile();
    if (!url) return;
    next("reveal");
  }

  const canProceedNamePhoto = useMemo(() => {
    return Boolean(form.name?.trim()) && Boolean(croppedPreview);
  }, [form.name, croppedPreview]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 backdrop-blur-xl space-y-6 border border-white/10">
        {/* Entry */}
        {step === "entry" && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">
              Others are already sitting under the tree. Let’s introduce yourself.
            </p>
            <button
              onClick={() => next("name_photo")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Begin my circle
            </button>
          </div>
        )}

        {/* Name + Photo (mandatory) */}
        {step === "name_photo" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What should we call you in the circle?</h2>
            <input
              type="text"
              placeholder="Your Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />

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
                      onClick={confirmCrop}
                      disabled={cropping}
                      className="flex-1 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
                    >
                      {cropping ? "Cropping…" : "Save crop"}
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

            <button
              onClick={() => next("roots")}
              disabled={!canProceedNamePhoto}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
              title={!canProceedNamePhoto ? "Add name and photo to continue" : ""}
            >
              Continue
            </button>
          </div>
        )}

        {/* Roots (with JSON output) */}
        {step === "roots" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>

            <ChautariLocationPicker
              value={form.roots}
              onChange={(v) => setForm({ ...form, roots: v })}
            />

            {form.roots?.label && (
              <p className="text-sm text-slate-300">Selected: {form.roots.label}</p>
            )}

            <button
              onClick={() => next("livelihood")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Livelihood */}
        {step === "livelihood" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What work do your hands and mind do?</h2>
            <input
              type="text"
              placeholder="Work / Livelihood"
              value={form.livelihood}
              onChange={(e) => setForm({ ...form, livelihood: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <input
              type="text"
              placeholder="Skills (comma-separated)"
              onChange={(e) =>
                setForm({
                  ...form,
                  skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("circles")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Circles */}
        {step === "circles" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Which circles or groups do you walk with?</h2>
            <input
              type="text"
              placeholder="Affiliations (comma-separated)"
              onChange={(e) =>
                setForm({
                  ...form,
                  circles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("family")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Family (optional) */}
        {step === "family" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Who walks beside you at home? (optional)</h2>
            <input
              type="text"
              placeholder="Family / Kinship"
              value={form.family}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("solidarity")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Solidarity */}
        {step === "solidarity" && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Solidarity Exchange</h2>
            <textarea
              placeholder="What can you offer? (comma-separated: time, skills, resources)"
              onChange={(e) =>
                setForm({
                  ...form,
                  offer: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <textarea
              placeholder="What do you need? (comma-separated: knowledge, help, connection)"
              onChange={(e) =>
                setForm({
                  ...form,
                  needs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("story")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Story */}
        {step === "story" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What’s your story?</h2>
            <textarea
              placeholder="Share your journey, struggles, or hopes… (max ~300 words)"
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2 min-h-28"
            />
            <button
              onClick={() => next("vow")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Vow */}
        {step === "vow" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Which vow speaks to you most?</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Courage",
                "Livelihood",
                "Justice",
                "Transparency",
                "Solidarity",
                "Servitude",
                "Culture",
                "Freedom",
              ].map((v) => (
                <button
                  key={v}
                  onClick={() => setForm({ ...form, vow: v })}
                  className={`rounded-lg px-4 py-2 ${
                    form.vow === v
                      ? "bg-amber-400 text-black font-bold"
                      : "bg-white/10 text-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={finishAndReveal}
              disabled={uploading || !form.vow}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
            >
              {uploading ? "Saving…" : "Finish my profile"}
            </button>
          </div>
        )}

        {/* Reveal */}
        {step === "reveal" && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">✨ Your circle is alive</h2>
            {form.photoUrlFinal && (
              <img
                src={form.photoUrlFinal}
                alt="Profile"
                className="mx-auto h-24 w-24 rounded-full object-cover"
              />
            )}
            <p className="text-slate-300">
              Others can now sit closer, see your story, and walk with you.
            </p>
            <a
              href="/members"
              className="block w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Enter the Chauṭarī
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
