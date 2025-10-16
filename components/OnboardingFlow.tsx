"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TrustStep from "@/components/onboard/TrustStep";

export default function OnboardingFlow() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = React.useMemo(() => {
    return sp.get("next")
      ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null)
      ?? "/dashboard";
  }, [sp]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <TrustStep onDone={() => router.push(next)} />
    </div>
  );
}
