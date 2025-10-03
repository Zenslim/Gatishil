'use client'

/**
 * components/OnboardingFlow.tsx — SKELETON ONLY (patched)
 * - Now passes required `t` prop to <NameFaceStep />
 */
import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = { lang?: 'en' | 'np' }

const WelcomeStep = dynamic(() => import('@/components/onboard/WelcomeStep'), { ssr: false })
const NameFaceStep = dynamic(() => import('@/components/onboard/NameFaceStep'), { ssr: false })
const RootsStep = dynamic(() => import('@/components/onboard/RootsStep'), { ssr: false })
const JanmandalStep = dynamic(() => import('@/components/onboard/JanmandalStep'), { ssr: false })

export default function OnboardingFlow({ lang = 'en' }: Props){
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = (searchParams.get('step') ?? 'entry')

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('step', s)
    if(!sp.get('src')) sp.set('src','join')
    router.push(`/onboard?${sp.toString()}`)
  }

  // Minimal i18n bundle to satisfy NameFaceStep prop typing
  const t = {
    nameface: {
      title: 'Name & Face',
      why: 'Faces help real people connect. You control visibility.',
      first_name: 'First name',
      surname: 'Surname (optional)',
      take_selfie: 'Take a selfie',
      choose_gallery: 'Choose from gallery',
      continue: 'Continue',
      back: 'Back',
      saved: 'Saved.',
    }
  }

  if(step === 'entry'){
    const tw = {
      welcome: {
        title: 'Welcome to the Chauṭarī.',
        subtitle: 'Others are already sitting under the tree. Let’s introduce yourself.',
        begin: 'Begin my circle',
        footer_privacy: 'You control what you share. Your face helps real people connect.',
      },
    }

    return (
      <div className="min-h-[80vh] grid place-items-center px-4">
        <WelcomeStep t={tw} onNext={() => go('name')} />
      </div>
    )
  }

  if(step === 'name'){
    return (
      <div className="min-h-[80vh] text-white px-4 md:px-6 grid place-items-center">
        <div className="w-full max-w-xl">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Name & Face</h2>
            <div className="text-white/80 text-sm">
              Show your face so people recognize you in the Chauṭarī.{` `}
              <button onClick={()=>alert(t.nameface.why)} className="underline">Why?</button>
            </div>
          </div>
          <NameFaceStep
            t={t}
            onBack={() => go('entry')}
            onNext={() => go('roots')}
          />
        </div>
      </div>
    )
  }

  if(step === 'roots'){
    return (
      <div className="min-h-[80vh] text-white px-4 md:px-6 relative pb-24">
        <RootsStep
          supabase={undefined as any}
          onNext={() => go('janmandal')}
          onBack={() => go('name')}
        />
      </div>
    )
  }

  if(step === 'janmandal'){
    return (
      <div className="min-h-[80vh] text-white px-4 md:px-6 grid place-items-center">
        <JanmandalStep onDone={() => router.replace('/dashboard')} />
      </div>
    )
  }

  return <div className="text-white p-6">Unknown step.</div>
}
