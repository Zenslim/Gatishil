// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

declare global {
  // eslint-disable-next-line no-var
  var __supabase__: SupabaseClient | undefined;
}

/**
 * Singleton Supabase client with a project-specific storageKey.
 * Prevents the "Multiple GoTrueClient instances" warning and
 * avoids clobbering tokens when multiple apps share a domain.
 */
if (!globalThis.__supabase__) {
  globalThis.__supabase__ = createClient(url, anon, {
    auth: {
      storageKey: 'gatishilnepal-auth', // unique key for this app
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = globalThis.__supabase__!;
export default supabase;
