import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from './env'

export function getSupabaseServer() {
  const cookieStore = cookies()
  const hdrs = headers()

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try { cookieStore.set({ name, value, ...options }) } catch {}
      },
      remove(name: string, options: any) {
        try { cookieStore.set({ name, value: '', ...options }) } catch {}
      }
    },
    headers: {
      'x-forwarded-host': hdrs.get('x-forwarded-host') ?? '',
      'x-forwarded-proto': hdrs.get('x-forwarded-proto') ?? ''
    }
  })
}

export const getServerSupabase = getSupabaseServer
