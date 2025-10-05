import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * @typedef {{ 
 *   onNext: (data: {name:string, surname:string|null, photo_url:string}) => void, 
 *   onBack?: () => void,
 *   t?: any
 * }} Props
 */

/**
 * NameFaceStep
 * - Uploads avatar to Supabase Storage (bucket: 'avatars')
 * - Upserts profile row by user_id (UNIQUE) with photo_url
 * - Persists the public photo_url (NOT a blob:)
 * - Enables Continue only when first name + publicUrl exist
 * - Accepts optional onBack (to satisfy OnboardingFlow.tsx)
 * @param {Props} props
 */
export default function NameFaceStep({ onNext, onBack, t }) {
  // form state
  const [first, setFirst] = useState("");
  const [surname, setSurname] = useState("");

  // image state
  const [previewUrl, setPreviewUrl] = useState(null); // local blob for preview
  const [publicUrl, setPublicUrl] = useState(null);   // Supabase public URL to persist
  const [editorSrc, setEditorSrc] = useState(null);   // reserved if you pipe a camera/editor

  // ui state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  // cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (editorSrc?.startsWith("blob:")) URL.revokeObjectURL(editorSrc);
    };
  }, [previewUrl, editorSrc]);

  // Upload to Storage and return public URL
  const uploadAvatar = async (blob, uid) => {
    const mime = blob.type || "image/webp";
    const ext = (mime.split("/")[1] || "webp").toLowerCase();
    const key = `${uid}/${Date.now()}.${ext}`;

    const { data: up, error: upErr } = await supabase
      .storage
      .from("avatars")
      .upload(key, blob, { contentType: mime, upsert: true });

    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(up.path);
    return pub.publicUrl;
  };

  // Called when user picks a file or confirms from editor
  const confirmAndSave = async (fileOrBlob) => {
    const blob = fileOrBlob; // File or Blob

    setSaving(true);
    setToast("");

    try {
      // show instant local preview
      const local = URL.createObjectURL(blob);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(local);

      // get session
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id;
      if (!uid) throw new Error("No session. Please sign in and try again.");

      // upload to Storage
      const photo_url = await uploadAvatar(blob, uid);
      setPublicUrl(photo_url);

      // upsert profile by user_id (requires UNIQUE on user_id)
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: uid,
            name: first.trim(),
            surname: surname.trim() || null,
            photo_url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) throw upsertErr;

      setToast("Saved.");
    } catch (e) {
      console.error("NameFaceStep upload/save error:", e);
      setToast(e?.message || "Upload failed. Try another image.");
      setPublicUrl(null); // keep button disabled
    } finally {
      setSaving(false);
    }
  };

  // Continue → pass persisted public URL (never the blob:)
  const continueNext = () => {
    if (!first.trim() || !publicUrl || saving) return;
    onNext?.({
      name: first.trim(),
      surname: surname.trim() || null,
      photo_url: publicUrl,
    });
  };

  const gateDisabled = !(first.trim() && publicUrl) || saving;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">
          {t?.nameface?.title ?? "Show your face so people recognize you in the Chauṭarī."}{" "}
          <button
            type="button"
            className="underline"
            onClick={() =>
              alert(
                t?.nameface?.why ??
                  "Faces help real people connect. You control how your profile appears."
              )
            }
          >
            {t?.nameface?.why_label ?? "Why?"}
          </button>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm underline opacity-80 hover:opacity-100"
          >
            {t?.common?.back ?? "Back"}
          </button>
        )}
      </div>

      <label className="text-sm opacity-80">First name*</label>
      <input
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        className="input w-full"
        placeholder={t?.nameface?.placeholders?.first ?? "Enter your first name"}
      />

      <label className="text-sm opacity-80">Surname (optional)</label>
      <input
        value={surname}
        onChange={(e) => setSurname(e.target.value)}
        className="input w-full"
        placeholder={t?.nameface?.placeholders?.surname ?? "Enter your surname"}
      />

      <div className="flex items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-black/50 overflow-hidden border border-neutral-700">
          {previewUrl ? (
            <img className="w-full h-full object-cover" src={previewUrl} alt="face" />
          ) : null}
        </div>

        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {t?.nameface?.cta?.choose ?? "Choose from gallery"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) confirmAndSave(file);
          }}
        />
      </div>

      <button
        type="button"
        disabled={gateDisabled}
        className={`btn w-full ${gateDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={continueNext}
      >
        {saving ? (t?.common?.saving ?? "Saving...") : t?.nameface?.cta?.continue ?? "Continue"}
      </button>

      {!!toast && <p className="text-sm opacity-80">{toast}</p>}
    </div>
  );
}
