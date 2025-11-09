'use client';

import { Suspense } from 'react';
import OnboardingFlow from '@/components/OnboardingFlow';

export const dynamic = 'force-dynamic';

function Flow() {
  // Keep this tiny wrapper so Suspense can isolate the hook usage inside the tree.
  return <OnboardingFlow />;
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-black text-white">
          <div className="animate-pulse text-sm text-slate-300">Loading…</div>
        </main>
      }
    >
      <Flow />
    </Suspense>
  );
}
