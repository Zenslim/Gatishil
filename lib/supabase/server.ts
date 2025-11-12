// lib/supabase/server.ts
import { cookies as nextCookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Server-side Supabase client bound to Next.js App Router cookies.
 * Uses the required getAll/setAll adapter so Supabase can read/write
 * session cookies on the same response cycle (Vercel-friendly).
 */
export function getSupabaseServer() {
  const store = nextCookies();

  return createServerClient<Database>(url, anon, {
    cookies: {
      // Read the full cookie jar for this request
      getAll() {
        // Next.js returns { name, value }[]
        return store.getAll();
      },
      // Commit all cookies emitted by Supabase to this response
      setAll(cookieList: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value, options } of cookieList) {
          store.set(name, value, options);
        }
      },
    },
  });
}

// Optional convenience default export if some files do `import supabase from ...`
export default getSupabaseServer;
