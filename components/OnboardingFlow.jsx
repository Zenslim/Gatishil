/* Drop-in minimal OnboardingFlow that routes to Janmandal after Roots.
   If you already have OnboardingFlow, only ensure it renders <JanmandalStep />
   when step === 'janmandal'. This component reads ?step=... from URL.
*/
import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

const JanmandalStep = dynamic(() => import('@/components/onboard/JanmandalStep'), { ssr: false })
const RootsStep = dynamic(() => import('@/components/ChautariLocationPicker'), { ssr: false })

export default function OnboardingFlow(){
  const router = useRouter()
  const step = (router.query.step || 'roots').toString()

  const go = (s) => router.push(`/onboard?src=join&step=${s}`, undefined, { shallow:true })

  if(step === 'roots'){
    return <div className="min-h-[80vh] text-white px-4 md:px-6">
      <RootsStep onComplete={()=>go('janmandal')} />
    </div>
  }

  if(step === 'janmandal'){
    return <JanmandalStep onDone={()=>router.replace('/dashboard')} />
  }

  return <div className="text-white p-6">Unknown step.</div>
}
