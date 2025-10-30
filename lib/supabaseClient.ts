// lib/supabaseClient.ts
// Server-safe resolver with backward-compatible exports.
// Provides getSupabaseBrowser() and alias getSupabaseBrowserClient().
// On the server, returns a lazy proxy that throws only when used, not at import time.

import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function _ensureBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client is only available in the browser');
  }
}

export function getSupabaseBrowser(): SupabaseClient {
  _ensureBrowser();
  if (!_client) {
    // require at call-time so importing this file on the server is harmless
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@/lib/supabase/browser');
    _client = mod.supabaseBrowser();
  }
  return _client;
}

// Back-compat alias expected by some modules
export const getSupabaseBrowserClient = getSupabaseBrowser;

// Legacy default used in some codepaths
export const supabase = getSupabaseBrowser;

// Optional: a noop server proxy to avoid crashing SSR if someone *accidentally* calls methods.
// It throws when any property is accessed.
export const __serverOnlySupabase__: SupabaseClient = new Proxy({} as SupabaseClient, {
  get() {
    throw new Error('Supabase browser client is not available on the server. Move this call into useEffect or a client component.');
  },
});
