// lib/requireSessionUser.ts
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase' // your generated types if any

export async function requireSessionUser() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return user
}
