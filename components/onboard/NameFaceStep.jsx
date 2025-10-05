import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NameFaceStep({ onNext, t }) {
  const [first, setFirst] = useState("");
  const [surname, setSurname] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [publicUrl, setPublicUrl] = useState(null);
  const [allowContinue, setAllowContinue] = useState(false);
  const [toast, setToast] = useState("");
  const [editorSrc, setEditorSrc] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (editorSrc?.startsWith("blob:")) URL.revokeObjectURL(editorSrc);
    };
  }, [previewUrl, editorSrc]);

  const uploadAvatar = async (blob, uid) => {
    const mime = blob.type || "image/webp";
    const ext = mime.split("/")[1] || "webp";
    const key = `${uid}/${Date.now()}.${ext}`;
    const { error, data } = await supabase.storage.from("avatars").upload(key, blob, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(data.path);
    return pub.publicUrl;
  };

  const confirmAndSave = async (imgBlob) => {
    setSaving(true);
    try {
      const localUrl = URL.createObjectURL(imgBlob);
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(localUrl);

      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) throw new Error("No session");

      const photo_url = await uploadAvatar(imgBlob, uid);
      setPublicUrl(photo_url);

      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: uid,
          name: first.trim(),
          surname: surname.trim() || null,
          photo_url,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      setToast("Saved.");
      setAllowContinue(true);
    } catch (err) {
      console.error(err);
      setToast(err?.message || "Photo upload failed. Please try another image.");
    } finally {
      setSaving(false);
    }
  };

  const continueNext = () => {
    if (!allowContinue || !first.trim() || !publicUrl) return;
    onNext?.({ name: first.trim(), surname: surname.trim() || null, photo_url: publicUrl });
  };

  const gateDisabled = !(first.trim().length > 0 && allowContinue && publicUrl) || saving;

  return (
    <div className="flex flex-col gap-4">
      <label>First name*</label>
      <input
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        className="input"
        placeholder="Enter your first name"
      />
      <label>Surname (optional)</label>
      <input
        value={surname}
        onChange={(e) => setSurname(e.target.value)}
        className="input"
        placeholder="Enter your surname"
      />

      <div className="flex items-center gap-3">
        <div className="w-24 h-24 rounded-full bg-black/50 overflow-hidden border border-neutral-700">
          {previewUrl ? (
            <img src={previewUrl} alt="face" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn">
          Choose Photo
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
        className={`btn w-full ${gateDisabled ? "opacity-50" : ""}`}
        onClick={continueNext}
      >
        {saving ? "Saving..." : t?.nameface?.cta?.continue ?? "Continue"}
      </button>

      {toast && <p className="text-sm text-green-500">{toast}</p>}
    </div>
  );
}
