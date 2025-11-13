// lib/supabase/browser.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | null = null;
let isSyncing = false;

/**
 * Keep server cookies (sb-*) in lockstep with the in-memory Supabase session.
 * Triggered on SIGNED_IN and TOKEN_REFRESHED so middleware sees a valid session.
 */
const syncSessionCookies = async (session: Session | null | undefined) => {
  if (isSyncing) return;

  const access_token = session?.access_token ?? null;
  const refresh_token = session?.refresh_token ?? null;
  if (!access_token || !refresh_token) return;

  isSyncing = true;
  try {
    await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      // Minimal contract: send raw tokens; server will set/rotate sb-* cookies.
      body: JSON.stringify({ access_token, refresh_token }),
    });
  } catch {
    // Ignore network failures — cookies simply won't sync this cycle.
  } finally {
    isSyncing = false;
  }
};

export function getSupabaseBrowser(): SupabaseClient {
  if (singleton) return singleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  singleton = createBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'gatishil.auth.token',
    },
  });

  singleton.auth.onAuthStateChange((event, session) => {
    // When a user signs in (OTP/magic link) or when tokens auto-refresh,
    // sync cookies so server-side middleware recognizes the session.
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      void syncSessionCookies(session);
    }
  });

  return singleton;
}

// Handy proxy so you can `import { supabase } from '...'` anywhere on the client.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabaseBrowser();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
