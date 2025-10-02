// components/onboard/WelcomeStep.jsx
"use client";
export default function WelcomeStep({ t, onNext }) {
  return (
    <section className="mx-auto max-w-xl px-6 pt-10 pb-16 text-center">
      <h1 className="text-3xl font-semibold">{t.welcome.title}</h1>
      <p className="mt-3 text-base text-gray-600">{t.welcome.subtitle}</p>
      <button onClick={onNext} className="mt-8 rounded-2xl bg-black px-5 py-3 text-white hover:bg-gray-800">
        {t.welcome.begin}
      </button>
      <p className="mt-6 text-xs text-gray-500">{t.welcome.footer_privacy}</p>
    </section>
  );
}
