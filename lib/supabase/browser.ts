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

// Handy proxy so you can `import { supabase } from '...'` anywhere on the client.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabaseBrowser();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const getSupabaseBrowserClient = getSupabaseBrowser;
