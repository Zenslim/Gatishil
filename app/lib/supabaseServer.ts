// lib/supabaseServer.ts — server-side Supabase client (uses service role if provided)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export function getServerSupabase() {
  const key = service || anon;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
