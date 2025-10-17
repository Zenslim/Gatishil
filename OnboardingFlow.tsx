'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

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
      <TrustStep />
    )
  }

  return (
    <div className="min-h-[80vh] bg-neutral-950 text-white p-6">
      Unknown step.
    </div>
  )
}
