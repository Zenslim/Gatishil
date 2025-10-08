// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from './env';

// Ensure a single browser client per window to avoid "Multiple GoTrueClient instances" warnings.
const getGlobal = () => (typeof window !== 'undefined' ? (window as any) : (globalThis as any));
const GLOBAL_KEY = '__gatishil_sb__';

export function getSupabaseBrowser() {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookieOptions: { sameSite: 'lax' }
    });
  }
  return g[GLOBAL_KEY];
}
