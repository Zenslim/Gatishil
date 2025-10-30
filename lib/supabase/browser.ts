// lib/supabase/browser.ts
'use client';

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowser__: SupabaseClient<any, 'public', any> | undefined;
}

/**
 * Singleton Supabase browser client.
 * Prevents "Multiple GoTrueClient instances" warning and storage key clashes.
 */
export function supabaseBrowser(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('supabaseBrowser() called on the server');
  }
  if (!globalThis.__supabaseBrowser__) {
    globalThis.__supabaseBrowser__ = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storageKey: 'gatishil.auth.v1', // unique storage key
        },
      },
    );
  }
  return globalThis.__supabaseBrowser__;
}
