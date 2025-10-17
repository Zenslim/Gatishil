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

// Clears any stale/invalid local session that can cause
// "Invalid Refresh Token: Refresh Token Not Found" on app init.
export async function resetLocalSessionIfInvalid() {
  try {
    const { data, error } = await supabase.auth.getSession();
    // If the SDK attempted to refresh and failed, error will be present.
    if (error) {
      // Clear ONLY local state; do not revoke server session/cookies.
      await supabase.auth.signOut({ scope: 'local' });
    }
    // If there's no active session and local storage has remnants,
    // getSession above already attempted refresh; we still keep local clear.
  } catch {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch: ...
  }
}
