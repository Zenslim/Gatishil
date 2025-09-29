"use client";

/**
 * Gatishil — Digital Chauṭarī Onboarding (Photo Mandatory)
 * Remote-only: Next.js (App Router) + Vercel + Supabase
 *
 * What this file does:
 * - Phone-joined member completes profile as a warm, step-by-step ritual.
 * - Photo is MANDATORY: upload any image, crop to a circle, compress to WebP.
 * - Photo is uploaded to Supabase Storage at profiles/photos/{userId}/profile.webp
 * - Profile data is upserted into `profiles` table with public photo URL.
 *
 * Requirements:
 *   npm i @supabase/supabase-js react-easy-crop
 * Env (Vercel Project Settings → Environment Variables):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Storage Bucket (once):
 *   Create bucket "profiles" (public) in Supabase → Storage
 *   Folder structure will be created automatically: profiles/photos/{userId}/profile.webp
 *
 * DB (once):
 *   create table if not exists public.profiles (
 *     user_id uuid primary key references auth.users(id) on delete cascade,
 *     name text,
 *     photo_url text,
 *     roots text,
 *     diaspora text,
 *     livelihood text,
 *     skills text[],         -- store as array of text (or pivot later)
 *     circles text[],
 *     family text,
 *     offer text[],
 *     needs text[],
 *     story text,
 *     vow text,
 *     updated_at timestamptz default now()
 *   );
 *   -- RLS: enable and allow user to upsert own row
 *   alter table public.profiles enable row level security;
 *   create policy "upsert own profile"
 *     on public.profiles for all
 *     using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { createClient } from "@supabase/supabase-js";

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
    photoUrlFinal: "", // final public URL after upload
    roots: "",
    diaspora: "",
    livelihood: "",
    skills: [],
    circles: [],
    family: "",
    offer: [],
    needs: [],
    story: "",
    vow: "",
  });

  // Photo handling
  const [rawPhotoSrc, setRawPhotoSrc] = useState(""); // object URL of selected file
  const [rawFile, setRawFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [croppedPreview, setCroppedPreview] = useState(""); // preview data URL
  const [uploading, setUploading] = useState(false);

  // Fetch logged-in user (joined by phone already)
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

    // draw cropped square into canvas
    const { x, y, width, height } = cropPixels;
    // scale to output square
    ctx.drawImage(
      image,
      x,
      y,
      width,
      height,
      0,
      0,
      outputSize,
      outputSize
    );

    // export as webp (~0.8 quality)
    return await new Promise((resolve) =>
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/webp",
        0.8
      )
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

  const next = (nextStep) => setStep(nextStep);

  async function uploadPhotoAndSaveProfile() {
    if (!userId) {
      alert("Authentication required. Please rejoin/login.");
      return;
    }
    if (!croppedPreview) {
      alert("Please upload and crop your photo first.");
      return;
    }
    setUploading(true);
    try {
      // fetch blob back from preview URL
      const resp = await fetch(croppedPreview);
      const blob = await resp.blob();

      const path = `photos/${userId}/profile.webp`;
      // remove any existing
      await supabase.storage.from("profiles").remove([path]).catch(() => {});
      // upload
      const { error: upErr } = await supabase.storage
        .from("profiles")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (upErr) throw upErr;

      // get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(path);

      // upsert profile
      const payload = {
        user_id: userId,
        name: form.name || null,
        photo_url: publicUrl,
        roots: form.roots || null,
        diaspora: form.diaspora || null,
        livelihood: form.livelihood || null,
        skills: form.skills?.length ? form.skills : null,
        circles: form.circles?.length ? form.circles : null,
        family: form.family || null,
        offer: form.offer?.length ? form.offer : null,
        needs: form.needs?.length ? form.needs : null,
        story: form.story || null,
        vow: form.vow || null,
      };

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
        {/* STEP: Entry */}
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

        {/* STEP: Name + Photo (MANDATORY) */}
        {step === "name_photo" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              What should we call you in the circle?
            </h2>
            <input
              type="text"
              placeholder="Your Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />

            <div className="space-y-2">
              <p className="text-slate-300">Add your photo (no mask in the chauṭarī)</p>

              {!rawPhotoSrc && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setRawFile(file);
                    const durl = await fileToDataURL(file);
                    setRawPhotoSrc(durl);
                    setCroppedPreview(""); // reset previous crop
                  }}
                  className="block w-full text-sm text-slate-400
                    file:mr-4 file:rounded-lg file:border-0
                    file:bg-amber-400 file:px-4 file:py-2
                    file:text-sm file:font-semibold file:text-black
                    hover:file:bg-amber-500"
                />
              )}

              {/* Cropper */}
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
                        setRawFile(null);
                        setCroppedPreview("");
                      }}
                      className="rounded-lg border border-white/20 px-4 py-2"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              )}

              {/* Cropped preview */}
              {croppedPreview && (
                <div className="text-center space-y-2">
                  <img
                    src={croppedPreview}
                    alt="Cropped preview"
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                  <button
                    onClick={() => {
                      // re-crop if they want
                      setCroppedPreview("");
                    }}
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

        {/* STEP: Roots */}
        {step === "roots" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Where do your roots touch the earth?
            </h2>
            <input
              type="text"
              placeholder="Ward/District or City"
              value={form.roots}
              onChange={(e) => setForm({ ...form, roots: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <input
              type="text"
              placeholder="Diaspora (Country/City) — optional"
              value={form.diaspora}
              onChange={(e) => setForm({ ...form, diaspora: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("livelihood")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP: Livelihood */}
        {step === "livelihood" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              What work do your hands and mind do?
            </h2>
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
                setForm({ ...form, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
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

        {/* STEP: Circles */}
        {step === "circles" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Which circles or groups do you walk with?
            </h2>
            <input
              type="text"
              placeholder="Affiliations (comma-separated)"
              onChange={(e) =>
                setForm({ ...form, circles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
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

        {/* STEP: Family (optional) */}
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

        {/* STEP: Solidarity */}
        {step === "solidarity" && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Solidarity Exchange</h2>
            <textarea
              placeholder="What can you offer? (comma-separated: time, skills, resources)"
              onChange={(e) =>
                setForm({ ...form, offer: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <textarea
              placeholder="What do you need? (comma-separated: knowledge, help, connection)"
              onChange={(e) =>
                setForm({ ...form, needs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
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

        {/* STEP: Story */}
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

        {/* STEP: Vow */}
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

        {/* STEP: Reveal */}
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
