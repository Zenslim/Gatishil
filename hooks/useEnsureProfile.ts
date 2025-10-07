'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Ensures a minimal profiles row exists for the authenticated user.
// It never overwrites existing profile data.
export function useEnsureProfile() {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = TrueOnce()
  }, [])
}

function TrueOnce() {
  ;(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload: any = { user_id: user.id }
    // If available, fill soft fields once (do not overwrite on conflict)
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name
    if (fullName && typeof fullName === 'string') {
      const parts = fullName.trim().split(/\s+/)
      payload.name = parts[0]
      if (parts.length > 1) payload.surname = parts.slice(1).join(' ')
    }
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
    if (avatar) payload.photo_url = avatar

    // Insert-ignoring duplicates. If row exists, do nothing.
    await supabase
      .from('profiles')
      .insert(payload, { upsert: false })
      .select('user_id')
      .single()
      .catch(() => undefined)
  })()
  return true
}
