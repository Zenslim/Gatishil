'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function StatusPage() {
  const [ready, setReady] = useState(false);
  const [authStatus, setAuthStatus] = useState<'signed_in' | 'signed_out' | 'unknown'>('unknown');

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        setAuthStatus(data?.user ? 'signed_in' : 'signed_out');
      } catch {
        if (alive) setAuthStatus('unknown');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Status</h1>
      <p className="text-sm text-gray-500 mb-4">Build succeeds fix: remove duplicate imports; ensure client page.</p>
      <div className="rounded border p-4 font-mono text-sm">
        <div>ready: {String(ready)}</div>
        <div>auth: {authStatus}</div>
      </div>
    </main>
  );
}
