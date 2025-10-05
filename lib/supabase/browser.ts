'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (singleton).
 * Provides both `getBrowserSupabase()` and a ready `supabase` instance,
 * so older imports like `import { supabase } from '@/lib/supabase/browser'`
 * keep working.
 */
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    _client = createBrowserClient(url, key);
  }
  return _client;
}

export const supabase = getBrowserSupabase();

// Re-export to satisfy existing imports found in build logs
export { createBrowserClient };
