"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Unified browser Supabase client.
 *
 * The auth helpers use a single cookie format across middleware, server,
 * and client layers, so sb-* cookies stay readable JSON instead of base64.
 * Import this client in any browser component to participate in that
 * contract.
 */
const syncSessionCookies = async (session: Session | null) => {
  const access_token = session?.access_token;
  const refresh_token = session?.refresh_token;

  if (!access_token || !refresh_token) {
    return;
  }

  try {
    await fetch("/api/auth/sync", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    });
  } catch {
    // Ignore network failures — the next auth event will retry.
  }
};

export const supabase = createBrowserSupabaseClient<Database>();

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    void syncSessionCookies(session);
  }
});
