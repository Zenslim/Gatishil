// components/onboard/NameFaceStep.jsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // ✅ use your existing client

const AVATAR_BUCKET = "avatars";
const MIN_SIZE = 1024;

export default function NameFaceStep({ t, onBack, onNext }) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const cropToSquare = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const c = document.createElement("canvas");
        c.width = MIN_SIZE; c.height = MIN_SIZE;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MIN_SIZE, MIN_SIZE);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("Blob failed"))), "image/jpeg", 0.9);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });

  const upload = async (blob, userId) => {
    const key = `u_${userId}_${Date.now()}.jpg`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(key, blob, { contentType: "image/jpeg" });
    if (up.error) throw up.error;
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(up.data.path).data.publicUrl;
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) throw new Error("Not signed in");

      let photo_url = null;
      if (file && preview) {
        const blob = await cropToSquare(preview);
        photo_url = await upload(blob, uid);
      }

      const { error } = await supabase.from("profiles").upsert(
        { user_id: uid, name: name.trim(), surname: surname.trim() || null, photo_url },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      setMsg(t.nameFace.toasts.saved);
      onNext({ name: name.trim(), surname: surname.trim() || null, photo_url });
    } catch (e) {
      console.error(e);
      setMsg(t.nameFace.toasts.uploadFail);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-6 pt-6 pb-16">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border px-3 py-2 text-sm">← Back</button>
      </div>

      {msg && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      <h2 className="text-2xl font-semibold">{t.nameFace.stepTitle}</h2>
      <p className="mt-2 text-gray-600">{t.nameFace.hint}</p>

      <label className="mt-6 block">
        <span className="text-sm font-medium">{t.nameFace.labels.name}</span>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder={t.nameFace.placeholders.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium">{t.nameFace.labels.surname}</span>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder={t.nameFace.placeholders.surname}
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />
      </label>

      <div className="mt-5">
        <span className="text-sm font-medium">{t.nameFace.labels.addPhoto}</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
            {preview ? (
              <Image src={preview} alt="Preview" fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">1:1</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
              <input type="file" accept="image/*" capture="user" onChange={onPick} className="hidden" />
              {t.nameFace.cta.takeSelfie}
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
              <input type="file" accept="image/*" onChange={onPick} className="hidden" />
              {t.nameFace.cta.chooseGallery}
            </label>
            {preview && (
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
                className="rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t.nameFace.cta.retake}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-2xl bg-black px-5 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : t.nameFace.cta.continue}
        </button>
      </div>
    </section>
  );
}
