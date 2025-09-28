// app/security/page.tsx — SERVER (no "use client")
import { Suspense } from 'react';
import SecurityClient from './SecurityClient';

// Force runtime to be dynamic so we don't prerender /security
export const dynamic = 'force-dynamic';

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh grid place-items-center text-sm text-slate-400">
          Preparing security setup…
        </main>
      }
    >
      <SecurityClient />
    </Suspense>
  );
}
