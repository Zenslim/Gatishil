/* components/OnboardingFlow.tsx — App Router compatible
   - Accepts `lang` prop from app/onboard/page.tsx
   - Uses useSearchParams from next/navigation
   - Routes between ?step=roots and ?step=janmandal
*/
'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  lang?: 'en' | 'np'
}

const JanmandalStep = dynamic(() => import('@/components/onboard/JanmandalStep'), { ssr: false })
const RootsStep = dynamic(() => import('@/components/ChautariLocationPicker'), { ssr: false })

export default function OnboardingFlow({ lang = 'en' }: Props){
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = (searchParams.get('step') ?? 'roots')

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('step', s)
    if(!sp.get('src')) sp.set('src','join')
    router.push(`/onboard?${sp.toString()}`)
  }

  if(step === 'roots'){
    return (
      <div className="min-h-[80vh] text-white px-4 md:px-6">
        <RootsStep onComplete={()=>go('janmandal')} lang={lang} />
      </div>
    )
  }

  if(step === 'janmandal'){
    return <JanmandalStep onDone={()=>router.replace('/dashboard')} />
  }

  return <div className="text-white p-6">Unknown step.</div>
}
