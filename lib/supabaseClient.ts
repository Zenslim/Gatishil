'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient__: SupabaseClient | undefined;
}

type BrowserEnvKey = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

function ensureBrowserRuntime() {
  if (typeof window === 'undefined') {
    throw new Error('supabaseClient is browser-only. Use lib/supabase/server on the server.');
  }
}

function getBrowserEnv(key: BrowserEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  ensureBrowserRuntime();
  if (!globalThis.__supabaseBrowserClient__) {
    const url = getBrowserEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getBrowserEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    globalThis.__supabaseBrowserClient__ = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: { 'X-Client-Info': 'gatishil/browser' },
      },
    });
  }
  return globalThis.__supabaseBrowserClient__;
}

export const supabase = getSupabaseBrowserClient();
