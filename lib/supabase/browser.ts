import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | null = null;
let isSyncing = false;

const syncSessionCookies = async (client: SupabaseClient) => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    const access_token = session?.access_token ?? null;
    const refresh_token = session?.refresh_token ?? null;
    if (!access_token) return;

    await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
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

  void syncSessionCookies(singleton);

  singleton.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      void syncSessionCookies(singleton!);
    }
  });

  return singleton;
}

export const supabase = getSupabaseBrowser();
