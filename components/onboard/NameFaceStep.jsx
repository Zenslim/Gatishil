"use client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/unifiedClient";
import OnboardCardLayout from "./OnboardCardLayout";
import CameraCapture from "./CameraCapture";
import ImageEditor from "./ImageEditor";

const AVATAR_BUCKET = "avatars";

/**
 * NameFaceStep — UI preserved (card, colors), logic fixed
 * - Keeps your original beautiful UI (OnboardCardLayout, Tailwind classes).
 * - Uploads to Supabase Storage and stores the PUBLIC url (not blob:).
 * - Upserts profiles by auth user id (profiles.id), with updated_at.
 * - Continue enables only when first name + publicUrl exist.
 */
export default function NameFaceStep({ t, onBack, onNext }) {
  const [first, setFirst] = useState("");
  const [surname, setSurname] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [editorSrc, setEditorSrc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // blob for UI
  const [publicUrl, setPublicUrl] = useState(null);   // supabase public URL

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (editorSrc?.startsWith("blob:")) URL.revokeObjectURL(editorSrc);
    };
  }, [previewUrl, editorSrc]);

  const pickFromGallery = (e) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    setEditorSrc(url);
  };

  const uploadAvatar = async (blob, uid) => {
    const mime = blob.type || "image/webp";
    const ext = (mime.split("/")[1] || "webp").toLowerCase();
    const key = `${uid}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(key, blob, { contentType: mime, upsert: true });
    if (up.error) throw up.error;
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(up.data.path).data.publicUrl;
  };

  const confirmAndSave = async (imgBlob) => {
    setSaving(true);
    try {
      const localUrl = URL.createObjectURL(imgBlob);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(localUrl);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("No user");

      const uid = user.id;

      const photo_url = await uploadAvatar(imgBlob, uid);
      setPublicUrl(photo_url);

      const metadata = user.user_metadata ?? {};
      const fallbackFullName = metadata.full_name || metadata.name || null;
      const nameValue = first.trim() || fallbackFullName || user.email || null;
      const row = {
        id: uid,
        name: nameValue,
        surname: surname.trim() || null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        photo_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(row, { onConflict: "id" });
      if (error) throw error;

      setToast("Saved.");
    } catch (err) {
      console.error(err);
      setToast(err?.message || "Photo upload failed. Please try another image.");
      setPublicUrl(null);
    } finally {
      setSaving(false);
    }
  };

  const continueNext = () => {
    if (!first.trim() || !publicUrl || saving) return;
    onNext?.({ name: first.trim(), surname: surname.trim() || null, photo_url: publicUrl });
  };

  const gateDisabled = !(first.trim() && publicUrl) || saving;

  return (
    <OnboardCardLayout>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10">← {t?.common?.back ?? "Back"}</button>
        <div className="text-sm text-gray-400">1/3</div>
      </div>

      {toast && <div className="mb-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{toast}</div>}

      <h2 className="text-2xl font-semibold text-white">
        {t?.nameface?.title ?? "Show your face so people recognize you in the Chauṭarī."}{" "}
        <button onClick={()=>alert(t?.nameface?.why ?? "Faces help real people connect. You control visibility.")} className="underline">
          {t?.nameface?.why_label ?? "Why?"}
        </button>
      </h2>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-300">First name*</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="e.g., Nabin"
            value={first}
            onChange={(e)=> setFirst(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-300">Surname (optional)</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="e.g., Shrestha"
            value={surname}
            onChange={(e)=> setSurname(e.target.value)}
          />
        </label>
      </div>

      {/* Photo area */}
      <div className="mt-6 grid grid-cols-[140px_1fr] gap-4 items-start">
        <div className="w-[140px] h-[140px] rounded-full bg-black/40 border border-white/10 grid place-items-center overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-sm text-gray-500">1:1</div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={()=>setShowCamera(true)} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10">Take a selfie</button>
          <label className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10 cursor-pointer">
            Choose from gallery
            <input type="file" accept="image/*" onChange={pickFromGallery} className="hidden" />
          </label>
        </div>
      </div>

      {/* Editor */}
      {editorSrc && (
        <ImageEditor
          src={editorSrc}
          onCancel={()=>setEditorSrc(null)}
          onConfirm={(blob)=>{ setEditorSrc(null); confirmAndSave(blob); }}
        />
      )}
      {showCamera && (
        <CameraCapture
          onCapture={(url)=>{ setShowCamera(false); setEditorSrc(url); }}
          onCancel={()=>setShowCamera(false)}
        />
      )}

      <div className="mt-8">
        <button
          onClick={continueNext}
          disabled={gateDisabled}
          className={`w-full rounded-2xl ${gateDisabled ? "bg-yellow-600/60" : "bg-yellow-500 hover:bg-yellow-400"} px-5 py-3 text-black font-semibold disabled:opacity-60`}
        >
          {saving ? (t?.common?.saving ?? "Saving...") : (t?.nameface?.cta?.continue ?? "Continue")}
        </button>
      </div>
    </OnboardCardLayout>
  );
}
