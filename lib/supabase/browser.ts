'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client (singleton) without @supabase/ssr.
 * Exports `supabase` and `getBrowserSupabase()` to keep existing imports working.
 */
let _client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export const supabase = getBrowserSupabase();
