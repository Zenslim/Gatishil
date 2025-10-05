import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side Supabase client for Route Handlers / Server Components.
 * Uses anon key; swap to SERVICE_ROLE where required in secure-only contexts.
 */
export function getServerSupabase() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        cookieStore.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
        cookieStore.set({ name, value: '', ...options, expires: new Date(0) });
      },
    },
    // Pass through headers to help SSR session detection
    headers: {
      get: (name: string) => headers().get(name) ?? undefined,
    },
  });
}

export { createServerClient };
