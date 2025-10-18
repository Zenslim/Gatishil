// lib/supabase/server.ts
// Single source of truth for the server Supabase client factory.
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: any) {
        try { cookieStore.set({ name, value: '', ...options }); } catch {}
      },
    },
    headers: { 'x-forwarded-host': headers().get('x-forwarded-host') ?? undefined },
  });
}
