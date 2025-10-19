'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client-side Supabase with safer defaults for OTP flow:
// - detectSessionInUrl: false (prevents URL parsing / token confusion on /join)
// - persistSession: true (keeps session in localStorage)
// - autoRefreshToken: true
let singleton: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (singleton) return singleton;

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase client credentials missing');
  }

  singleton = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return singleton;
}

export function getSupabaseClient(): SupabaseClient {
  return ensureClient();
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = ensureClient();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Clears any stale/invalid local session that can cause
 * "Invalid Refresh Token: Refresh Token Not Found" on app init.
 * Only clears local state; does not revoke server-side sessions/cookies.
 */
export async function resetLocalSessionIfInvalid() {
  try {
    const supabase = ensureClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      // If refresh failed or client is in a bad state, nuke local-only session.
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch (e) {
    // Defensive: if anything throws here, clear local session to recover.
    try {
      const supabase = ensureClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
  }
}
