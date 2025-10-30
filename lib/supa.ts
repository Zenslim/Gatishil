// lib/supa.ts
import { createClient } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!; // server only
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createBrowserSupabase() {
  return getSupabaseBrowser();
}
