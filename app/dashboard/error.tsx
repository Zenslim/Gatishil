// app/dashboard/error.tsx
'use client';

import React from 'react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('DashboardError:', error);
  return (
    <div className="min-h-[60vh] rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
      <h2 className="text-lg font-semibold">Dashboard failed to load</h2>
      <pre className="mt-3 whitespace-pre-wrap text-xs text-red-100/90">{String(error?.message || 'Unknown error')}</pre>
      <div className="mt-4 flex gap-3">
        <button onClick={() => reset()} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Try again</button>
        <a href="/login?next=/dashboard" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Re-authenticate</a>
      </div>
    </div>
  );
}
