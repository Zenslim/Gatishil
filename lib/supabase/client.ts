'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowser } from './browser';

export function getSupabaseClient(): SupabaseClient {
  return getSupabaseBrowser();
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabaseBrowser();
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
    const supabaseClient = getSupabaseBrowser();
    const { error } = await supabaseClient.auth.getSession();
    if (error) {
      // If refresh failed or client is in a bad state, nuke local-only session.
      await supabaseClient.auth.signOut({ scope: 'local' });
    }
  } catch (e) {
    // Defensive: if anything throws here, clear local session to recover.
    try {
      const supabaseClient = getSupabaseBrowser();
      await supabaseClient.auth.signOut({ scope: 'local' });
    } catch {}
  }
}

export const getSupabaseBrowserClient = getSupabaseBrowser;
