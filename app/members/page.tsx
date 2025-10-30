'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function MembersPage() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    // Create the browser client only in the browser
    const supabase = getSupabaseBrowserClient();
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (alive) setSessionUser(data?.user ?? null);
      } catch {
        if (alive) setSessionUser(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Members</h1>
      <p className="text-sm text-gray-500 mb-4">Safe on SSR: browser client is created inside useEffect.</p>
      <div className="rounded border p-4 font-mono text-sm">
        {sessionUser ? (
          <div>Signed in as: {sessionUser.email ?? sessionUser.id}</div>
        ) : (
          <div>Signed out</div>
        )}
      </div>
    </main>
  );
}
