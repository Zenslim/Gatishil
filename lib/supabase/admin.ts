// lib/supabase/admin.ts — Service role client (server-only)
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

if (!url || !service) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

export function getAdminSupabase(): SupabaseClient {
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
}


