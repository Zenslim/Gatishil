// components/onboard/RootsStep.jsx
"use client";
import { useState } from "react";

export default function RootsStep({ t, onBack, onNext }) {
  const [abroad, setAbroad] = useState(false);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [palika, setPalika] = useState("");
  const [ward, setWard] = useState("");
  const [tole, setTole] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const cont = () => {
    const roots = abroad
      ? { abroad: true, country: country.trim(), city: city.trim() }
      : { abroad: false, province: province.trim(), district: district.trim(), palika: palika.trim(), ward: ward.trim(), tole: tole.trim() || null };
    localStorage.setItem("onboard.roots", JSON.stringify(roots));
    onNext(roots);
  };

  return (
    <section className="mx-auto max-w-xl px-6 pt-6 pb-16">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border px-3 py-2 text-sm">← Back</button>
      </div>

      <h2 className="mt-2 text-2xl font-semibold">{t.roots.stepTitle}</h2>
      <p className="mt-2 text-gray-600">{t.roots.hint}</p>

      <label className="mt-4 inline-flex items-center gap-3">
        <input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} />
        <span>{t.roots.toggleAbroad}</span>
      </label>

      {!abroad ? (
        <div className="mt-4 grid gap-3">
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.province} value={province} onChange={(e) => setProvince(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.district} value={district} onChange={(e) => setDistrict(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.palika} value={palika} onChange={(e) => setPalika(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.ward} value={ward} onChange={(e) => setWard(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.tole} value={tole} onChange={(e) => setTole(e.target.value)} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.country} value={country} onChange={(e) => setCountry(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" placeholder={t.roots.labels.city} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border px-4 py-2">{t.roots.cta.back}</button>
        <button onClick={cont} className="rounded-2xl bg-black px-5 py-3 text-white hover:bg-gray-800">{t.roots.cta.continue}</button>
      </div>
    </section>
  );
}
