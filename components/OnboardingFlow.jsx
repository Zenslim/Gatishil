"use client";

import { useState } from "react";

const steps = [
  "entry",
  "name",
  "roots",
  "livelihood",
  "circles",
  "family",
  "solidarity",
  "story",
  "vow",
  "reveal",
];

export default function OnboardingFlow() {
  const [step, setStep] = useState("entry");
  const [form, setForm] = useState({
    name: "",
    photo: "",
    roots: "",
    diaspora: "",
    livelihood: "",
    skills: [],
    circles: [],
    family: "",
    offer: [],
    needs: [],
    story: "",
    vow: "",
  });

  const next = (nextStep) => setStep(nextStep);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-xl bg-white/5 p-6 backdrop-blur-xl">
        {step === "entry" && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">🌳 Welcome to the Chauṭarī</h1>
            <p className="text-slate-300">
              Others are already sitting under the tree. Let’s introduce yourself.
            </p>
            <button
              onClick={() => next("name")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Begin my circle
            </button>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              What should we call you in the circle?
            </h2>
            <input
              type="text"
              placeholder="Your Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <div className="space-y-2">
              <p className="text-slate-300">Add your photo (no mask in the chauṭarī)</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setForm({
                    ...form,
                    photo: URL.createObjectURL(e.target.files[0]),
                  })
                }
                className="block w-full text-sm text-slate-400
                  file:mr-4 file:rounded-lg file:border-0
                  file:bg-amber-400 file:px-4 file:py-2
                  file:text-sm file:font-semibold file:text-black
                  hover:file:bg-amber-500"
              />
              {form.photo && (
                <img
                  src={form.photo}
                  alt="Profile preview"
                  className="mt-2 h-24 w-24 rounded-full object-cover mx-auto"
                />
              )}
            </div>
            <button
              onClick={() => next("roots")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Next
            </button>
          </div>
        )}

        {step === "roots" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Where do your roots touch the earth?
            </h2>
            <input
              type="text"
              placeholder="Ward/District or City"
              value={form.roots}
              onChange={(e) => setForm({ ...form, roots: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("livelihood")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "livelihood" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              What work do your hands and mind do?
            </h2>
            <input
              type="text"
              placeholder="Work / Livelihood"
              value={form.livelihood}
              onChange={(e) => setForm({ ...form, livelihood: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("circles")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "circles" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Which circles or groups do you walk with?
            </h2>
            <input
              type="text"
              placeholder="Cooperatives / Cultural Groups"
              value={form.circles}
              onChange={(e) => setForm({ ...form, circles: [e.target.value] })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("family")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "family" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Who walks beside you at home?</h2>
            <input
              type="text"
              placeholder="Family (optional)"
              value={form.family}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("solidarity")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "solidarity" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Solidarity Exchange</h2>
            <textarea
              placeholder="What can you offer?"
              value={form.offer}
              onChange={(e) => setForm({ ...form, offer: [e.target.value] })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <textarea
              placeholder="What do you need?"
              value={form.needs}
              onChange={(e) => setForm({ ...form, needs: [e.target.value] })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("story")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "story" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What’s your story?</h2>
            <textarea
              placeholder="Share your journey, struggles, or hopes..."
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              className="w-full rounded-lg border border-white/20 bg-black/30 p-2"
            />
            <button
              onClick={() => next("vow")}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Continue
            </button>
          </div>
        )}

        {step === "vow" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Which vow speaks to you most?</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Courage",
                "Livelihood",
                "Justice",
                "Transparency",
                "Solidarity",
                "Servitude",
                "Culture",
                "Freedom",
              ].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setForm({ ...form, vow: v });
                    next("reveal");
                  }}
                  className={`rounded-lg px-4 py-2 ${
                    form.vow === v
                      ? "bg-amber-400 text-black font-bold"
                      : "bg-white/10 text-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "reveal" && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">✨ Your circle is alive</h2>
            <p className="text-slate-300">
              Others can now sit closer, see your story, and walk with you.
            </p>
            <button
              onClick={() => alert(JSON.stringify(form, null, 2))}
              className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black"
            >
              Enter the Chauṭarī
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
