'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useEnsureProfile } from '@/hooks/useEnsureProfile'

export default function JoinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEnsureProfile()

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        setLoading(false)
      }
    })()
  }, [router])

  const begin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/onboard?src=join')
    }
  }, [router])

  if (loading) return null

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="max-w-md w-full p-6 rounded-2xl border border-white/10 bg-white/5">
        <h1 className="text-2xl font-semibold text-center">Welcome to the Chauṭarī</h1>
        <p className="mt-2 text-center text-slate-300">
          Others are already sitting under the tree. Let&apos;s introduce yourself.
        </p>
        <button
          onClick={begin}
          className="mt-6 w-full rounded-xl py-3 font-medium border border-emerald-300/40 hover:bg-emerald-500/10 transition"
        >
          Begin my circle
        </button>
      </div>
    </main>
  )
}
