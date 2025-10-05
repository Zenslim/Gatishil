import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client without @supabase/ssr.
 * Uses SERVICE_ROLE if provided (secure server-only), otherwise falls back to anon.
 * No cookie/session persistence here; use it for backend actions/routes.
 */
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    throw new Error('Missing SUPABASE keys. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'X-Client-Info': 'gatishil/server' },
    },
  });
}

export { getServerSupabase as createServerClient }; // light compat if referenced by old name
