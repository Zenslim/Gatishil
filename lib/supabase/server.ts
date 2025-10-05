// lib/supabase/server.ts
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(
  key: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
): string {
  const v = process.env[key];
  if (!v) throw new Error(`[supabase-server] Missing ${key} in environment`);
  return v;
}

const url  = env('NEXT_PUBLIC_SUPABASE_URL');
const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY'); // server should NOT use service role by default

export function createServerClient(): SupabaseClient {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// (optional backward alias if other files still call getServerSupabase)
export const getServerSupabase = createServerClient;
