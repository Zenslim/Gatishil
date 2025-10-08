import { createBrowserClient } from '@supabase/ssr'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from './env'

const getGlobal = () => (typeof window !== 'undefined' ? window : globalThis)
const GLOBAL_KEY = '__gatishil_sb__'

export function getSupabaseBrowser() {
  const g: any = getGlobal()
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createBrowserClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookieOptions: { sameSite: 'lax' } }
    )
  }
  return g[GLOBAL_KEY]
}

export const supabase = getSupabaseBrowser()
