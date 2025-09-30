"use client";

/**
 * OnboardingFlow.jsx — Chauṭarī Onboarding (Screens 0–2 only)
 * Remote-only: Next.js + Supabase + Vercel
 *
 * Implements the NEW wireframe up to Roots:
 *  - Screen 0: Entry prompt
 *  - Screen 1: Name & Surname & Photo (circle)
 *  - Screen 2: Roots (Nepal cascade or Diaspora) via <ChautariLocationPicker/>
 *
 * Saves nothing until the user presses "Save & Continue" on Roots.
 * On save: upsert into public.profiles by user_id.
 *
 * Requirements (Vercel env):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Supabase:
 *  - Storage bucket: "profiles" (public) for photo upload
 *  - Table: public.profiles with columns:
 *      user_id (uuid, PK or unique), name text, surname text,
 *      photo_url text, roots text, diaspora text,
 *      roots_json jsonb, diaspora_json jsonb, updated_at timestamptz
 */

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ChautariLocationPicker from "./ChautariLocationPicker";

/** Single, remote-only Supabase client */
const supabase =
  globalThis.__onb_supabase__ ||
  (globalThis.__onb_supabase__ = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));

/** Tiny UI helpers */
function Row({ children }) {
  return <div className="mb-4">{children}</div>;
}
function Label({ children }) {
  return <label className="block text-sm text-neutral-300 mb-1">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400 ${
        props.className || ""
      }`}
    />
  );
}
function Button({ children, disabled, onClick, title }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`w-full rounded-lg px-4 py-2 font-semibold ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-amber-300"
      } bg-amber-400 text-black`}
    >
      {children}
    </button>
  );
}

export default function OnboardingFlow() {
  const [step, setStep] = useState("entry"); // 'entry' | 'name' | 'roots'
  const [userId, setUserId] = useState(null);

  // Screen 1 state
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Screen 2 state
  const [roots, setRoots] = useState(null); // normalized object from ChautariLocationPicker

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data?.user?.id || null;
      setUserId(id);

      // Prefill if profile exists
      if (id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("name, surname, photo_url, roots_json")
          .eq("user_id", id)
          .maybeSingle();
        if (prof) {
          setName(prof.name || "");
          setSurname(prof.surname || "");
          setPhotoUrl(prof.photo_url || "");
          setRoots(prof.roots_json || null);
        }
      }
    })();
  }, []);

  async function handlePhotoSelect(file) {
    if (!file || !userId) return;
    setUploading(true);
    try {
      // Optional client-size check
      if (file.size > 3 * 1024 * 1024) {
        alert("Please choose an image under 3 MB.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `photos/${userId}/profile.${ext}`;

      // Clear old then upload
      await supabase.storage.from("profiles").remove([path]).catch(() => {});
      const { error } = await supabase.storage
        .from("profiles")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profiles").getPublicUrl(path);

      setPhotoUrl(publicUrl);
    } catch (e) {
      console.error(e);
      alert("Photo upload failed. Please try another image.");
    } finally {
      setUploading(false);
    }
  }

  const canNextFromName = useMemo(() => {
    return Boolean(name.trim()) && Boolean(surname.trim()) && Boolean(photoUrl);
  }, [name, surname, photoUrl]);

  async function saveRootsAndContinue() {
    if (!userId) {
      alert("Please sign in and try again.");
      return;
    }
    if (!roots?.label) {
      alert("Please finish Roots (Ward for Nepal or City for Abroad).");
      return;
    }

    // Build JSON for storage
    const rootsJson =
      roots?.type === "ward"
        ? {
            type: "ward",
            ward_id: roots.id,
            ward_no: roots.ward_no ?? null,
            local_level_id: roots.local_level_id ?? null,
            district_id: roots.district_id ?? null,
            province_id: roots.province_id ?? null,
            label: roots.label,
            tole_id: roots.tole_id ?? null,
            tole_text: roots.tole_text ?? null,
          }
        : roots?.type === "city"
        ? {
            type: "city",
            city_id: roots.city_id ?? roots.id ?? null,
            country_code: roots.country_code ?? null,
            label: roots.label,
            city_text: roots.city_text ?? null,
          }
        : null;

    const diasporaJson = rootsJson?.type === "city" ? rootsJson : null;

    const payload = {
      user_id: userId,
      name: name.trim(),
      surname: surname.trim(),
      photo_url: photoUrl || null,
      roots: rootsJson?.type === "ward" ? rootsJson.label : null,
      diaspora: rootsJson?.type === "city" ? rootsJson.label : null,
      roots_json: rootsJson,
      diaspora_json: diasporaJson,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      alert("Could not save your profile. Please try again.");
      return;
    }

    // Next screens come later — for now, send them in
    window.location.href = "/members";
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
        {/* Screen 0 — Entry */}
        {step === "entry" && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">🌳</div>
            <h1 className="text-2xl font-bold">Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">
              Others are already sitting under the tree. Let’s introduce yourself.
            </p>
            <Button onClick={() => setStep("name")}>Begin my circle</Button>
          </div>
        )}

        {/* Screen 1 — Name & Face */}
        {step === "name" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What should we call you in the circle?</h2>

            <Row>
              <Label>Name</Label>
              <Input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
              />
            </Row>

            <Row>
              <Label>Surname</Label>
              <Input
                type="text"
                placeholder="Your Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                autoComplete="family-name"
              />
            </Row>

            <Row>
              <Label>Photo (circle)</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">No photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                    disabled={uploading || !userId}
                  />
                  <p className="text-xs text-neutral-400 mt-1">
                    Use a clear face photo. Max ~3 MB.
                  </p>
                </div>
              </div>
            </Row>

            <Button
              onClick={() => setStep("roots")}
              disabled={!canNextFromName}
              title={!canNextFromName ? "Fill name, surname and add photo to continue" : ""}
            >
              Next
            </Button>
          </div>
        )}

        {/* Screen 2 — Roots */}
        {step === "roots" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>

            <ChautariLocationPicker value={roots} onChange={setRoots} />

            <div className="text-xs text-neutral-400 mt-2">
              Selected:{" "}
              <span className="text-neutral-200">{roots?.label || "—"}</span>
            </div>

            <Button onClick={saveRootsAndContinue}>Save & Continue</Button>
            <button
              type="button"
              onClick={() => setStep("name")}
              className="mt-3 w-full rounded-lg border border-white/20 px-4 py-2 text-slate-200 hover:bg-white/10"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
