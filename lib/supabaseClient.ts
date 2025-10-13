"use client";

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Fail fast during build if envs are missing
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

let browserClient: SupabaseClient | undefined;

const getBrowserSingleton = (): SupabaseClient => {
  if (!browserClient) {
    browserClient = createBrowserClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gatishil.auth.token',
      },
    });
  }
  return browserClient;
};

// Browser-safe singleton client
export const supabase = getBrowserSingleton();

// Alias names to satisfy various imports across the app
export const getSupabaseBrowser = () => getBrowserSingleton();
export const getSupabaseBrowserClient = () => getBrowserSingleton();
