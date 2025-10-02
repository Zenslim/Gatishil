// components/onboard/IkigaiStep.jsx
"use client";
import { useState } from "react";

export default function IkigaiStep({ t, onBack, onFinish }) {
  const [goal, setGoal] = useState("");

  const finish = () => {
    localStorage.setItem("onboard.ikigai", JSON.stringify({ goal: goal.trim() }));
    onFinish();
  };

  return (
    <section className="mx-auto max-w-xl px-6 pt-6 pb-16">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border px-3 py-2 text-sm">← Back</button>
      </div>

      <h2 className="mt-2 text-2xl font-semibold">{t.ikigai.stepTitle}</h2>
      <p className="mt-2 text-gray-600">{t.ikigai.hint}</p>
      <textarea className="mt-4 w-full min-h-[120px] rounded-xl border px-3 py-2"
                placeholder={t.ikigai.placeholder} value={goal} onChange={(e) => setGoal(e.target.value)} />
      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="rounded-xl border px-4 py-2">{t.ikigai.cta.back}</button>
        <button onClick={finish} className="rounded-2xl bg-black px-5 py-3 text-white hover:bg-gray-800">{t.ikigai.cta.finish}</button>
      </div>
    </section>
  );
}
