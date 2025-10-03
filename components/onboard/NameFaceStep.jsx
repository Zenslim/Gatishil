// components/onboard/NameFaceStep.jsx
"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "@/styles/OnboardFX.module.css";
import CameraCapture from "./CameraCapture";
import ImageEditor from "./ImageEditor";

const AVATAR_BUCKET = "avatars";

export default function NameFaceStep({ t, onBack, onNext }) {
  const [first, setFirst] = useState("");
  const [surname, setSurname] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [editorSrc, setEditorSrc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [savedBlob, setSavedBlob] = useState(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [allowContinue, setAllowContinue] = useState(false);

  useEffect(() => { if (!toast) return; const id = setTimeout(()=>setToast(null), 1800); return ()=>clearTimeout(id); }, [toast]);

  const pickFromGallery = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    setEditorSrc(url);
  };

  const uploadAvatar = async (blob, uid) => {
    const key = `${uid}/${Date.now()}.webp`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(key, blob, { contentType: "image/webp" });
    if (up.error) throw up.error;
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(up.data.path).data.publicUrl;
  };

  const confirmAndSave = async (imgBlob) => {
    setSaving(true);
    try {
      const localUrl = URL.createObjectURL(imgBlob);
      setPreviewUrl(localUrl);
      setSavedBlob(imgBlob);

      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) throw new Error("No session");

      const photo_url = await uploadAvatar(imgBlob, uid);
      const { error } = await supabase.from("profiles").upsert(
        { user_id: uid, name: first.trim(), surname: surname.trim() || null, photo_url },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      setToast("Saved.");
      setAllowContinue(true);
      setEditorSrc(null);
    } catch (e) {
      console.error(e);
      setToast("Upload failed.");
      setAllowContinue(false);
    } finally {
      setSaving(false);
    }
  };

  const continueNext = () => {
    if (!(first.trim().length > 0 && allowContinue) || saving) return;
    onNext({ name: first.trim(), surname: surname.trim() || null, photo_url: previewUrl });
  };

  const gateDisabled = !(first.trim().length > 0 && allowContinue) || saving;

  return (
    <section className={`mx-auto max-w-xl rounded-2xl ${styles.card} px-6 pt-6 pb-8`}>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">← Back</button>
        <div className="text-sm text-gray-400">1/3</div>
      </div>

      {toast && <div className="mb-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{toast}</div>}

      <h2 className="text-2xl font-semibold text-white">Show your face so people recognize you in the Chautari. <button onClick={()=>alert('Faces help real people connect. You control visibility.')} className="underline">Why?</button></h2>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-200">First name*</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Nabin"
            value={first}
            onChange={(e)=>{ setFirst(e.target.value); }}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-200">Surname (optional)</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Shrestha"
            value={surname}
            onChange={(e)=>setSurname(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-gray-200">Your photo</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            {previewUrl ? <Image src={previewUrl} alt="Preview" fill className="object-cover" /> :
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">1:1</div>}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={()=>setShowCamera(true)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              Take a selfie
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              <input type="file" accept="image/*" onChange={pickFromGallery} className="hidden" />
              Choose from gallery
            </label>
            {previewUrl && (
              <button onClick={()=>{ setPreviewUrl(null); setAllowContinue(false); setSavedBlob(null); }} className="rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
                Retake
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={continueNext}
          disabled={gateDisabled}
          className={`w-full rounded-2xl ${gateDisabled ? "bg-indigo-500/40" : "bg-indigo-500 hover:bg-indigo-400"} px-5 py-3 text-white disabled:opacity-60`}
        >
          {saving ? "Saving..." : (t?.nameFace?.cta?.continue ?? "Continue")}
        </button>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(url) => { setShowCamera(false); setEditorSrc(url); }}
          onCancel={() => setShowCamera(false)}
        />
      )}
      {editorSrc && (
        <ImageEditor
          src={editorSrc}
          onRetake={() => { setEditorSrc(null); setShowCamera(true); }}
          onConfirm={(blob) => confirmAndSave(blob)}
        />
      )}
    </section>
  );
}
