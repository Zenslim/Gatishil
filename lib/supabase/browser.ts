// lib/supabase/browser.ts
'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(
  key: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
): string {
  const v = process.env[key];
  if (!v) throw new Error(`[supabase-browser] Missing ${key} in environment`);
  return v;
}

const url  = env('NEXT_PUBLIC_SUPABASE_URL');
const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export function createBrowserClient(): SupabaseClient {
  // client: persist session is fine; Next.js will store in local storage
  return createClient(url, anon);
}
// optional backward alias if other files still import getBrowserSupabase
export const getBrowserSupabase = createBrowserClient;
