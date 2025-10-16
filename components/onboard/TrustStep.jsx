"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function TrustStep({ onDone }) {
  const router = useRouter();

  function goNext() {
    try {
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get("next");
      const target = (next && next.startsWith("/") && !next.startsWith("//")) ? next : "/dashboard";
      router.push(target);
    } catch {
      router.push("/dashboard");
    }
  }

  async function handleSealingComplete() {
    // ... your existing PIN/passkey logic ...
    if (typeof onDone === "function") onDone();
    else goNext();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Trust this device</h2>
      <p className="text-sm text-gray-600">Create a passkey/PIN to seal your voice to this device.</p>
      <button
        onClick={handleSealingComplete}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Continue
      </button>
    </div>
  );
}
