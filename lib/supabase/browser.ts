import { createBrowserClient } from '@supabase/ssr';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

let singleton: SupabaseClient | null = null;
let isSyncing = false;

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
      body: JSON.stringify({ event: 'TOKEN_REFRESHED', session: { access_token, refresh_token } }),
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
    if (event === 'TOKEN_REFRESHED') {
      void syncSessionCookies(session);
    }
  });

  return singleton;
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
