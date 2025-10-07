import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Guard against multiple GoTrueClient instances by memoizing on the global scope.
declare global {
  // eslint-disable-next-line no-var
  var __supabase__: SupabaseClient | undefined
}

export const supabase: SupabaseClient = (() => {
  if (typeof window === 'undefined') {
    if (!global.__supabase__) {
      global.__supabase__ = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      })
    }
    return global.__supabase__!
  }
  // browser
  if (!globalThis.__supabase__) {
    globalThis.__supabase__ = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }
  return globalThis.__supabase__!
})()
