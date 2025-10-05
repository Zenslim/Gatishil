// lib/supabase/server.ts — Single server Supabase client
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined
const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function getServerSupabase(): SupabaseClient {
  const key = service || anon
  return createClient(url!, key, { auth: { persistSession: false, autoRefreshToken: false } })
}


