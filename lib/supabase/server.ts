import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function getSupabaseServer(resp?: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Missing Supabase env');

  const writer = resp ? resp.cookies : cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        const store = cookies();
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        writer.set({
          name,
          value,
          ...options,
          path: options?.path ?? '/',
          httpOnly: options?.httpOnly ?? true,
          sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
          secure: options?.secure ?? true,
        });
      },
      remove(name: string, options: CookieOptions) {
        writer.set({
          name,
          value: '',
          ...options,
          path: options?.path ?? '/',
          httpOnly: options?.httpOnly ?? true,
          sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
          secure: options?.secure ?? true,
          maxAge: 0,
          expires: new Date(0),
        });
      },
    },
  });
}
