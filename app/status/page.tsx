// app/status/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function StatusPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const sb = getSupabaseBrowserClient();
      // optional: ping or status checks
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  return (
    <main className="min-h-[60vh] px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">Status</h1>
      {!ready ? (
        <p className="opacity-70">Checking…</p>
      ) : (
        <p className="opacity-80">All systems nominal (placeholder).</p>
      )}
    </main>
  );
}
