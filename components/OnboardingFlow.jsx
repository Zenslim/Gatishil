// components/OnboardingFlow.jsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STRINGS } from "@/app/onboard/strings";
import WelcomeStep from "./onboard/WelcomeStep";
import NameFaceStep from "./onboard/NameFaceStep";
import RootsStep from "./onboard/RootsStep";
import IkigaiStep from "./onboard/IkigaiStep";
import ProgressDots from "./onboard/ProgressDots";
import styles from "@/styles/OnboardFX.module.css";

export default function OnboardingFlow({ lang = "en" }) {
  const t = STRINGS[lang] || STRINGS.en;
  const STEP_ORDER = ["welcome","nameFace","roots","ikigai"];

  const getInitialStep = () => {
    if (typeof window === "undefined") return STEP_ORDER[0];
    const qp = new URLSearchParams(window.location.search);
    const s = qp.get("step"); const src = qp.get("src");
    if (s && STEP_ORDER.includes(s)) return s;
    if (src === "join") return "welcome";
    return STEP_ORDER[0];
  };

  const [step, setStep] = useState(getInitialStep());
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setAuthed(!!data?.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => mounted && setAuthed(!!session));
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const goTo = (next) => {
    const curr = STEP_ORDER.indexOf(step), nxt = STEP_ORDER.indexOf(next);
    if (nxt === -1 || nxt > curr + 1) return;
    setStep(next);
    const qp = new URLSearchParams(window.location.search); qp.set("step", next);
    window.history.replaceState(null,"",`?${qp.toString()}`);
  };

  const stepIndex = useMemo(() => STEP_ORDER.indexOf(step), [step]);

  if (!authed) {
    return (
      <div className="mx-6 mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
        Use OTP/Magic Link to sign in, then return here.
      </div>
    );
  }

  return (
    <div className={styles.theme}>{/* <-- variables are scoped here */}
      <div className={styles.starfield} />
      <header className={`sticky top-0 z-10 ${styles.headerShadow}`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="text-sm uppercase tracking-widest text-gray-300">Chauṭarī Onboarding</div>
          <div className="w-1/2">
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${((stepIndex+1)/STEP_ORDER.length)*100}%` }} />
            </div>
          </div>
          <ProgressDots index={stepIndex} total={STEP_ORDER.length} />
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 py-8">
        {step === "welcome"  && <WelcomeStep  t={t} onNext={() => goTo("nameFace")} />}
        {step === "nameFace" && <NameFaceStep t={t} onBack={() => goTo("welcome")} onNext={() => goTo("roots")} />}
        {step === "roots"    && <RootsStep    t={t} onBack={() => goTo("nameFace")} onNext={() => goTo("ikigai")} />}
        {step === "ikigai"   && <IkigaiStep   t={t} onBack={() => goTo("roots")} onFinish={() => alert(t.ikigai.done)} />}
      </main>
    </div>
  );
}
