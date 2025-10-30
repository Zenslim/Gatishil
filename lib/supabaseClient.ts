// lib/supabaseClient.ts
// Server-safe resolver. Only creates the browser client when called in the browser.
// Prevents crashes during Next.js prerender.

import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser() must be called in the browser');
  }
  if (!_client) {
    // require at call-time to avoid importing a 'use client' module on the server
    const mod = require('@/lib/supabase/browser');
    _client = mod.supabaseBrowser();
  }
  return _client;
}

// legacy named export expected by some code
export const supabase = getSupabaseBrowser;
