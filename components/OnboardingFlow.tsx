'use client'

/* components/OnboardingFlow.tsx — App Router compatible
   - No unsupported props passed to ChautariLocationPicker
   - Adds sticky footer Continue → ?step=janmandal
*/
import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  lang?: 'en' | 'np'
}

const JanmandalStep = dynamic(() => import('@/components/onboard/JanmandalStep'), { ssr: false })
const RootsStep: any = dynamic(() => import('@/components/ChautariLocationPicker'), { ssr: false })

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
      <div className="min-h-[80vh] text-white px-4 md:px-6 relative pb-24">
        <RootsStep />
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="rounded-2xl bg-black/70 backdrop-blur border border-white/10 p-3 flex items-center justify-between">
              <div className="text-sm text-white/80">
                When your roots look correct, continue.
              </div>
              <button
                onClick={()=>go('janmandal')}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if(step === 'janmandal'){
    return <JanmandalStep onDone={()=>router.replace('/dashboard')} />
  }

  return <div className="text-white p-6">Unknown step.</div>
}
