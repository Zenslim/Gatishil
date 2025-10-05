// lib/supabase/admin.ts
import 'server-only'; // prevents accidental client import
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(key: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const v = process.env[key];
  if (!v) throw new Error(`[supabase-admin] Missing ${key} in environment`);
  return v;
}

const url = env('NEXT_PUBLIC_SUPABASE_URL');
const service = env('SUPABASE_SERVICE_ROLE_KEY');

export function createAdminClient(): SupabaseClient {
  // admin client = server-only, no session persistence
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}
