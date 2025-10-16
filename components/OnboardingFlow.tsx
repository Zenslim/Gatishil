"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TrustStep from "./TrustStep";

export default function OnboardingFlow() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = React.useMemo(() => {
    // Prefer explicitly provided next, otherwise loop back to trust (if provided), else dashboard
    return sp.get("next") ?? (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next")
      : null) ?? "/dashboard";
  }, [sp]);

  // If you want to keep onDone wiring, honor next instead of hardcoding '/dashboard'
  return (
    <div className="mx-auto max-w-xl p-6">
      <TrustStep onDone={() => router.push(next)} />
    </div>
  );
}
