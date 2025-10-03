'use client'

/* components/OnboardingFlow.tsx — App Router compatible
   - No unsupported props passed to ChautariLocationPicker
   - Adds sticky footer Continue → ?step=janmandal
*/
import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  lang?: 'en' | 'np'
}

const JanmandalStep = dynamic(() => import('@/components/onboard/JanmandalStep'), { ssr: false })
const RootsStep: any = dynamic(() => import('@/components/ChautariLocationPicker'), { ssr: false })

export default function OnboardingFlow({ lang = 'en' }: Props){
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = (searchParams.get('step') ?? 'roots')

  // Roots state and actions must be declared at top-level to respect React Hooks rules
  const [rootsSelection, setRootsSelection] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const saveRootsAndContinue = useCallback(async () => {
    if(!rootsSelection) { return }
    setSaving(true)
    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if(uerr || !user){ setSaving(false); alert('Please sign in again.'); return }

    const payload: any = {
      updated_at: new Date().toISOString(),
      roots_type: rootsSelection.type,
      type: rootsSelection.type
    }

    if(rootsSelection.type === 'tole'){
      payload.province_id = rootsSelection.province_id
      payload.district_id = rootsSelection.district_id
      payload.local_level_id = rootsSelection.local_level_id
      payload.ward_id = rootsSelection.ward_id
      payload.tole_id = rootsSelection.tole_id
      payload.tole_text = rootsSelection.tole_text
    } else if(rootsSelection.type === 'city'){
      payload.country_code = rootsSelection.country_code
      payload.city_id = rootsSelection.city_id
      payload.city_text = rootsSelection.city_text
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', user.id)

    setSaving(false)
    if(error){ alert('Save failed: '+error.message); return }
    go('janmandal')
  }, [rootsSelection])

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('step', s)
    if(!sp.get('src')) sp.set('src','join')
    router.push(`/onboard?${sp.toString()}`)
  }

  if(step === 'roots'){
    return (
      <div className="min-h-[80vh] text-white px-4 md:px-6 relative pb-24">
        <RootsStep onChange={setRootsSelection} />
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="rounded-2xl bg-black/70 backdrop-blur border border-white/10 p-3 flex items-center justify-between">
              <div className="text-sm text-white/80">
                When your roots look correct, continue.
              </div>
              <button
                onClick={saveRootsAndContinue}
                disabled={!rootsSelection || saving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Continue →'}
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
