"use client";
import styles from "@/styles/OnboardFX.module.css";
export default function WelcomeStep({ t, onNext }) {
  return (
    <section className={`card mx-auto max-w-xl rounded-2xl ${styles.card} px-6 pt-10 pb-8 text-center`}>
      <h1 className="text-3xl font-semibold text-white">{t.welcome.title}</h1>
      <p className="mt-3 text-base text-gray-300">{t.welcome.subtitle}</p>
      <button
        onClick={onNext}
        className={`mt-8 w-full rounded-2xl bg-indigo-500 px-5 py-3 text-white hover:bg-indigo-400 ${styles.glowBtn}`}
      >
        {t.welcome.begin}
      </button>
      <p className="mt-6 text-xs text-gray-400">{t.welcome.footer_privacy}</p>
    </section>
  );
}
