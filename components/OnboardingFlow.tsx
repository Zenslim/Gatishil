'use client'
import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Props = { lang?: 'en' | 'np' }

const WelcomeStep = dynamic(() => import('@/components/onboard/WelcomeStep'), { ssr: false })
const NameFaceStep = dynamic(() => import('@/components/onboard/NameFaceStep'), { ssr: false })
const RootsStep = dynamic(() => import('@/components/onboard/RootsStep'), { ssr: false })
// REPLACED: JanmandalStep → AtmaDisha
const AtmaDishaStep = dynamic(() => import('@/components/AtmaDisha/AtmaDisha'), { ssr: false })
// 🌿 NEW: Trust Step (Ask for Passkey or PIN after introductions)
const TrustStep = dynamic(() => import('@/components/onboard/TrustStep'), { ssr: false })

export default function OnboardingFlow({ lang = 'en' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get('step') ?? 'entry'
  const code = searchParams.get('code')

  const [authReady, setAuthReady] = useState(() => !code)
  const [authError, setAuthError] = useState<string | null>(null)

  const sanitizedHref = useMemo(() => {
    if (typeof window === 'undefined') return null
    const sp = new URLSearchParams(window.location.search)
    sp.delete('code')
    const qs = sp.toString()
    return qs ? `/onboard?${qs}` : '/onboard'
  }, [code])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    ;(async () => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/exchange', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const payload: any = await res.json().catch(() => null)
        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.error || 'Could not confirm your sign-in link.')
        }

        const session = payload?.session
        if (session?.access_token && session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        } else {
          await supabase.auth.getSession()
        }

        if (cancelled) return
        setAuthReady(true)
        if (sanitizedHref) router.replace(sanitizedHref)
      } catch (err: any) {
        if (cancelled) return
        console.error('Failed to exchange onboarding code', err)
        setAuthError('Your sign-in link expired. Please request a new link from /join.')
        setAuthReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code, router, sanitizedHref])

  if (!authReady) {
    return (
      <div className="min-h-[80vh] bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-300">Preparing your session…</div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-[80vh] bg-neutral-950 text-white flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-base font-medium text-amber-300">We couldn&apos;t confirm your sign-in.</p>
          <p className="mt-3 text-sm text-gray-300">{authError}</p>
          <button
            className="mt-6 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => router.replace('/join')}
          >
            Go back to Join
          </button>
        </div>
      </div>
    )
  }

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('step', s)
    if (!sp.get('src')) sp.set('src', 'join')
    router.push(`/onboard?${sp.toString()}`)
  }

  const t = {
    welcome: {
      title: 'Welcome to the Chauṭarī.',
      subtitle: 'Others are already sitting under the tree. Let’s introduce yourself.',
      begin: 'Begin my circle',
      footer_privacy: 'You control what you share. Your face helps real people connect.',
    },
    nameface: {
      why: 'Faces help real people connect. You control visibility.',
    },
  }

  if (step === 'entry') {
    return <WelcomeStep t={t} onNext={() => go('name')} />
  }

  if (step === 'name') {
    return (
      <NameFaceStep
        t={t}
        onBack={() => go('entry')}
        onNext={() => go('roots')}
      />
    )
  }

  if (step === 'roots') {
    return (
      <RootsStep
        supabase={undefined as any}
        onNext={() => go('atmadisha')}
        onBack={() => go('name')}
      />
    )
  }

  if (step === 'atmadisha') {
    return (
      <div className="min-h-[80vh] bg-neutral-950 grid place-items-center px-4 md:px-6">
        {/* After Ātma Diśā completes, proceed to Trust Step */}
        <AtmaDishaStep onDone={() => go('trust')} />
      </div>
    )
  }

  if (step === 'trust') {
    return (
      <TrustStep onDone={() => router.push('/dashboard')} />
    )
  }

  return (
    <div className="min-h-[80vh] bg-neutral-950 text-white p-6">
      Unknown step.
    </div>
  )
}
