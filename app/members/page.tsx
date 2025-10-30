// app/members/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function MembersPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer any supabase/auth usage to the browser after mount
    try {
      const sb = getSupabaseBrowserClient();
      // optional: warm-up call or auth check could go here
    } catch {
      // ignore; on server it won't run
    } finally {
      setReady(true);
    }
  }, []);

  return (
    <main className="min-h-[60vh] px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">Members</h1>
      {!ready ? (
        <p className="opacity-70">Loading…</p>
      ) : (
        <p className="opacity-80">Members console will appear here.</p>
      )}
    </main>
  );
}
