// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Ensure single shared client (prevents "Multiple GoTrueClient instances" issue)
const globalForSupabase = globalThis as unknown as {
  __supabase?: ReturnType<typeof createClient>;
};

export const supabase =
  globalForSupabase.__supabase ??
  createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

if (process.env.NODE_ENV !== 'production') globalForSupabase.__supabase = supabase;
