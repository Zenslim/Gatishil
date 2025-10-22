// lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Single source of truth for server-side Supabase in App Router.
 * - Reads AND writes auth cookies via Next's cookie store.
 * - Works on Node runtime (as used by /app/login and /app/dashboard).
 */
export function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Normalize for production (secure, lax, path=/) to keep session visible to /login and /dashboard.
          cookieStore.set({
            name,
            value,
            ...options,
            path: options?.path ?? '/',
            sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
            secure: options?.secure ?? true,
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value: '',
            ...options,
            path: options?.path ?? '/',
            sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
            secure: options?.secure ?? true,
            maxAge: 0,
            expires: new Date(0),
          });
        },
      },
    }
  );
}
