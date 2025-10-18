'use client';

import { createClient } from '@supabase/supabase-js';

// Client-side Supabase with safer defaults for OTP flow:
// - detectSessionInUrl: false (prevents URL parsing / token confusion on /join)
// - persistSession: true (keeps session in localStorage)
// - autoRefreshToken: true
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Clears any stale/invalid local session that can cause
 * "Invalid Refresh Token: Refresh Token Not Found" on app init.
 * Only clears local state; does not revoke server-side sessions/cookies.
 */
export async function resetLocalSessionIfInvalid() {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      // If refresh failed or client is in a bad state, nuke local-only session.
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch (e) {
    // Defensive: if anything throws here, clear local session to recover.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
  }
}
