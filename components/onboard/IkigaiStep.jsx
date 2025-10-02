"use client";
import { useState } from "react";
import styles from "@/styles/OnboardFX.module.css";
export default function IkigaiStep({ t, onBack, onFinish }) {
  const [goal, setGoal] = useState(""); const finish = () => { localStorage.setItem("onboard.ikigai", JSON.stringify({ goal: goal.trim() })); onFinish(); };
  return (
    <section className={`mx-auto max-w-xl rounded-2xl ${styles.card} px-6 pt-6 pb-8`}>
      <div className="mb-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">← Back</button>
        <div className="text-sm text-gray-400">3/3</div>
      </div>
      <h2 className="text-2xl font-semibold text-white">{t.ikigai.stepTitle}</h2>
      <p className="mt-2 text-gray-300">{t.ikigai.hint}</p>
      <textarea className="mt-4 w-full min-h-[120px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t.ikigai.placeholder} value={goal} onChange={(e)=>setGoal(e.target.value)} />
      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 text-gray-200 hover:bg-white/5">{t.ikigai.cta.back}</button>
        <button onClick={finish} className={`rounded-2xl bg-indigo-500 px-5 py-3 text-white hover:bg-indigo-400 ${styles.glowBtn}`}>{t.ikigai.cta.finish}</button>
      </div>
    </section>
  );
}
