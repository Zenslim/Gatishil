// components/OnboardingFlow.jsx
"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { STRINGS } from "@/app/onboard/strings";
import WelcomeStep from "./onboard/WelcomeStep";
import NameFaceStep from "./onboard/NameFaceStep";
import RootsStep from "./onboard/RootsStep";
import IkigaiStep from "./onboard/IkigaiStep";

export default function OnboardingFlow({ lang = "en" }) {
  const t = STRINGS[lang] || STRINGS.en;
  const supabase = createClientComponentClient();

  const STEP_ORDER = ["welcome","nameFace","roots","ikigai"];
  const urlStep = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("step")
    : null;
  const initialStep = STEP_ORDER.includes(urlStep) ? urlStep : STEP_ORDER[0];
  const [step, setStep] = useState(initialStep);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
  }, [supabase]);

  const goTo = (next) => {
    const currIdx = STEP_ORDER.indexOf(step);
    const nextIdx = STEP_ORDER.indexOf(next);
    if (nextIdx === -1) return;       // unknown
    if (nextIdx > currIdx + 1) return; // no skipping ahead
    setStep(next);
    if (typeof window !== "undefined") {
      const qp = new URLSearchParams(window.location.search);
      qp.set("step", next);
      window.history.replaceState(null, "", `?${qp.toString()}`);
    }
  };

  if (!authed) {
    return (
      <div className="mx-6 mt-6 rounded-xl border px-4 py-3 text-sm text-gray-700">
        Use OTP/Magic Link to sign in, then return here.
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl">
      {step === "welcome" && <WelcomeStep t={t} onNext={() => goTo("nameFace")} />}
      {step === "nameFace" && (
        <NameFaceStep t={t} onBack={() => goTo("welcome")} onNext={() => goTo("roots")} />
      )}
      {step === "roots" && (
        <RootsStep t={t} onBack={() => goTo("nameFace")} onNext={() => goTo("ikigai")} />
      )}
      {step === "ikigai" && (
        <IkigaiStep t={t} onBack={() => goTo("roots")} onFinish={() => alert(t.ikigai.done)} />
      )}
    </main>
  );
}
