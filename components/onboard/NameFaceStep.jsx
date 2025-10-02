"use client";
import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "@/styles/OnboardFX.module.css";
const AVATAR_BUCKET = "avatars"; const MIN_SIZE = 1024;

export default function NameFaceStep({ t, onBack, onNext }) {
  const [name, setName] = useState(""); const [surname, setSurname] = useState("");
  const [preview, setPreview] = useState(null); const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState(null);

  const onPick = (e) => { const f = e.target.files?.[0]; if (!f || !f.type.startsWith("image/")) return; setFile(f); setPreview(URL.createObjectURL(f)); };

  const cropToSquare = (url) => new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width,img.height), sx=(img.width-side)/2, sy=(img.height-side)/2;
      const c=document.createElement("canvas"); c.width=MIN_SIZE; c.height=MIN_SIZE;
      c.getContext("2d").drawImage(img,sx,sy,side,side,0,0,MIN_SIZE,MIN_SIZE);
      c.toBlob(b=>b?resolve(b):reject(new Error("Blob failed")),"image/jpeg",0.9);
    };
    img.onerror=()=>reject(new Error("Image load failed")); img.src=url;
  });

  const upload = async (blob, uid) => {
    const key = `u_${uid}_${Date.now()}.jpg`;
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(key, blob, { contentType:"image/jpeg" });
    if (up.error) throw up.error;
    return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(up.data.path).data.publicUrl;
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession(); const uid = data.session?.user?.id;
      if (!uid) throw new Error("No session");
      let photo_url = null;
      if (file && preview) { const blob = await cropToSquare(preview); photo_url = await upload(blob, uid); }
      const { error } = await supabase.from("profiles").upsert({ user_id: uid, name: name.trim(), surname: surname.trim() || null, photo_url }, { onConflict: "user_id" });
      if (error) throw error;
      setMsg(t.nameFace?.toasts?.saved || "Saved."); onNext({ name: name.trim(), surname: surname.trim() || null, photo_url });
    } catch { setMsg(t.nameFace?.toasts?.uploadFail || "Upload failed."); }
    finally { setSaving(false); setTimeout(()=>setMsg(null), 2200); }
  };

  return (
    <section className={`mx-auto max-w-xl rounded-2xl ${styles.card} px-6 pt-6 pb-8`}>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">← Back</button>
        <div className="text-sm text-gray-400">1/3</div>
      </div>
      {msg && <div className="mb-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{msg}</div>}
      <h2 className="text-2xl font-semibold text-white">{t.nameFace.stepTitle}</h2>
      <p className="mt-2 text-gray-300">{t.nameFace.hint}</p>
      <label className="mt-6 block">
        <span className="text-sm font-medium text-gray-200">{t.nameFace.labels.name}</span>
        <input className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t.nameFace.placeholders.name} value={name} onChange={(e)=>setName(e.target.value)} required />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-gray-200">{t.nameFace.labels.surname}</span>
        <input className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t.nameFace.placeholders.surname} value={surname} onChange={(e)=>setSurname(e.target.value)} />
      </label>
      <div className="mt-5">
        <span className="text-sm font-medium text-gray-200">{t.nameFace.labels.addPhoto}</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
            {preview ? <Image src={preview} alt="Preview" fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">1:1</div>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              <input type="file" accept="image/*" capture="user" onChange={onPick} className="hidden" /> Take a selfie
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              <input type="file" accept="image/*" onChange={onPick} className="hidden" /> Choose from gallery
            </label>
            {preview && <button onClick={()=>{ setPreview(null); setFile(null); }} className="rounded-xl px-3 py-2 text-sm text-gray-300 hover:bg-white/5">Retake</button>}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={save} disabled={saving} className={`w-full rounded-2xl bg-indigo-500 px-5 py-3 text-white hover:bg-indigo-400 disabled:opacity-50 ${styles.glowBtn}`}>{saving ? "Saving..." : t.nameFace.cta.continue}</button>
      </div>
    </section>
  );
}
