'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function MembersPage() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);

  // Create the browser client once
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let alive = true
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (alive) setSessionUser(data?.user ?? null);
      } catch {
        if (alive) setSessionUser(null);
      }
    })();
    return () => {
      alive = false
    };
  }, [supabase]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Members</h1>
      <p className="text-sm text-gray-500 mb-4">Build succeeds fix: remove duplicate imports; ensure client page.</p>
      <div className="rounded border p-4">
        <div className="font-mono text-sm">
          {sessionUser ? (
            <span>Signed in as: {sessionUser.email ?? sessionUser.id}</span>
          ) : (
            <span>Signed out</span>
          )}
        </div>
      </div>
    </main>
  );
}
