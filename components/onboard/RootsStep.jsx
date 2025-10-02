"use client";
import { useState } from "react";
import styles from "@/styles/OnboardFX.module.css";
export default function RootsStep({ t, onBack, onNext }) {
  const [abroad, setAbroad] = useState(false);
  const [province, setProvince] = useState(""); const [district, setDistrict] = useState(""); const [palika, setPalika] = useState(""); const [ward, setWard] = useState(""); const [tole, setTole] = useState(""); const [country, setCountry] = useState(""); const [city, setCity] = useState("");      
  const cont = () => {
    const roots = abroad ? { abroad:true, country:country.trim(), city:city.trim() } : { abroad:false, province:province.trim(), district:district.trim(), palika:palika.trim(), ward:ward.trim(), tole:tole.trim()||null };
    localStorage.setItem("onboard.roots", JSON.stringify(roots)); onNext(roots);
  };
  const inputClass = "rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  return (
    <section className={`mx-auto max-w-xl rounded-2xl ${styles.card} px-6 pt-6 pb-8`}>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">← Back</button>
        <div className="text-sm text-gray-400">2/3</div>
      </div>
      <h2 className="text-2xl font-semibold text-white">{t.roots.stepTitle}</h2>
      <p className="mt-2 text-gray-300">{t.roots.hint}</p>
      <label className="mt-4 inline-flex items-center gap-3 text-gray-200">
        <input type="checkbox" checked={abroad} onChange={(e)=>setAbroad(e.target.checked)} />
        <span>{t.roots.toggleAbroad}</span>
      </label>
      {!abroad ? (
        <div className="mt-4 grid gap-3">
          {[ [province,setProvince,t.roots.labels.province],[district,setDistrict,t.roots.labels.district],[palika,setPalika,t.roots.labels.palika],[ward,setWard,t.roots.labels.ward],[tole,setTole,t.roots.labels.tole] ].map(([v,setV,ph],i)=>(<input key={i} className={inputClass} placeholder={ph} value={v as string} onChange={(e)=>setV(e.target.value)} />))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {[ [country,setCountry,t.roots.labels.country],[city,setCity,t.roots.labels.city] ].map(([v,setV,ph],i)=>(<input key={i} className={inputClass} placeholder={ph} value={v as string} onChange={(e)=>setV(e.target.value)} />))}
        </div>
      )}
      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 text-gray-200 hover:bg-white/5">{t.roots.cta.back}</button>
        <button onClick={cont} className={`rounded-2xl bg-indigo-500 px-5 py-3 text-white hover:bg-indigo-400 ${styles.glowBtn}`}>{t.roots.cta.continue}</button>
      </div>
    </section>
  );
}
