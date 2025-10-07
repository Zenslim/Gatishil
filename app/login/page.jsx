'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useEnsureProfile } from '@/hooks/useEnsureProfile'

// This page immediately routes users based on auth state, avoiding flicker.
export default function LoginRedirect() {
  const router = useRouter()
  useEnsureProfile()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        // Not logged in: send into onboarding join flow
        router.replace('/onboard?src=join')
      }
    })()
  }, [router])

  return null
}
