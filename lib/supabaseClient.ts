import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // Fail fast during build if envs are missing
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Browser-safe singleton client
export const supabase = createClient(url, anon);

// Alias names to satisfy various imports across the app
export const getSupabaseBrowser = () => supabase;
export const getSupabaseBrowserClient = () => supabase;
