/* JanmandalStep.jsx — five-orb soul-imprint after Roots
   Saves to profiles: hands[], gifts[], fire[], heart[], journey (enum), vision (text)
*/
import React, { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { starterChips, whisperQs } from '@/lib/janmandalSeeds'

const Orb = ({label, icon, color, active, onClick}) => (
  <button
    onClick={onClick}
    className={`rounded-full w-28 h-28 md:w-32 md:h-32 flex items-center justify-center shadow-lg transition-all duration-300
      ${active ? 'ring-4 ring-amber-400 scale-105' : 'ring-2 ring-white/20'} 
      ${color}`}
    aria-label={label}
  >
    <span className="text-2xl">{icon}</span>
  </button>
)

const Chip = ({text, onRemove}) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white mr-2 mb-2">
    {text}
    <button className="ml-2 text-white/70 hover:text-white" onClick={onRemove} aria-label={`remove ${text}`}>×</button>
  </span>
)

const TagInput = ({value, setValue, onAdd, placeholder}) => (
  <div className="flex gap-2">
    <input
      value={value}
      onChange={(e)=>setValue(e.target.value)}
      onKeyDown={(e)=>{ if(e.key==='Enter' && value.trim()){ onAdd(value.trim()); setValue('') } }}
      placeholder={placeholder}
      className="w-full bg-white/10 text-white placeholder-white/60 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
    />
    <button
      onClick={()=>{ if(value.trim()){ onAdd(value.trim()); setValue('') } }}
      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-medium"
    >Add</button>
  </div>
)

const JourneyPicker = ({journey, setJourney, vision, setVision}) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {['rooted','branching','sapling','searching'].map(opt => (
        <button
          key={opt}
          onClick={()=>setJourney(opt)}
          className={`px-3 py-3 rounded-xl border text-left transition
            ${journey===opt ? 'bg-amber-500 text-black border-transparent' : 'border-white/20 hover:border-amber-400 text-white'}`}
        >
          <div className="font-semibold capitalize">{opt}</div>
          <div className="text-sm opacity-80">
            {opt==='rooted' && 'Settling, building base'}
            {opt==='branching' && 'Expanding, taking new roles'}
            {opt==='sapling' && 'Learning, growing skills'}
            {opt==='searching' && 'Exploring, finding direction'}
          </div>
        </button>
      ))}
    </div>
    {(journey==='branching'||journey==='sapling'||journey==='searching') && (
      <input
        value={vision}
        onChange={(e)=>setVision(e.target.value)}
        placeholder="Optional: a direction calling you (vision)"
        className="w-full bg-white/10 text-white placeholder-white/60 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
      />
    )}
  </div>
)

export default function JanmandalStep({ onDone }){
  const [hands, setHands] = useState([])
  const [gifts, setGifts] = useState([])
  const [fire, setFire] = useState([])
  const [heart, setHeart] = useState([])
  const [journey, setJourney] = useState('')
  const [vision, setVision] = useState('')

  const [activePanel, setActivePanel] = useState('') // hands|gifts|fire|heart|journey
  const [inputVal, setInputVal] = useState('')

  const [saving, setSaving] = useState(false)
  const [affirm, setAffirm] = useState('')

  useEffect(()=>{
    const lines = [
      'यो तिम्रो पहिलो जनमण्डल हो।',
      'तिमीले दिएको उज्यालो अब हाम्रो साझा आकाशमा मिसियो।',
      'स्वागत छ चौतारीमा।'
    ]
    setAffirm(lines[Math.floor(Math.random()*lines.length)])
  }, [])

  const addTag = (kind, text) => {
    const add = (arr, set)=> !arr.includes(text) && set([...arr, text])
    if(kind==='hands') add(hands,setHands)
    if(kind==='gifts') add(gifts,setGifts)
    if(kind==='fire')  add(fire,setFire)
    if(kind==='heart') add(heart,setHeart)
  }
  const removeTag = (kind, text) => {
    const rm = (arr,set)=> set(arr.filter(x=>x!==text))
    if(kind==='hands') rm(hands,setHands)
    if(kind==='gifts') rm(gifts,setGifts)
    if(kind==='fire')  rm(fire,setFire)
    if(kind==='heart') rm(heart,setHeart)
  }

  const filled = hands.length + gifts.length + fire.length + heart.length + (journey?1:0) > 0

  const save = async () => {
    setSaving(true)
    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if(uerr || !user){ setSaving(false); alert('Please sign in again.'); return }
    const payload = {
      hands, gifts, fire, heart,
      journey: journey || null,
      vision: vision || null,
      updated_at: new Date().toISOString()
    }
    const {error} = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', user.id)
    setSaving(false)
    if(error){ alert('Save failed: '+error.message); return }
    // completion moment
    onDone && onDone()
  }

  return (
    <div className="min-h-[80vh] w-full text-white relative px-4 md:px-6">
      <div className="max-w-3xl mx-auto pt-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-center mb-2">Janmandal — Soul Imprint</h1>
        <p className="text-center text-white/80 mb-8">Touch any orb. Whisper a few words. No pressure.</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-3 grid-rows-3 gap-6 place-items-center">
        <div className="col-start-2 row-start-1">
          <Orb label="Fire" icon="🔥" color="bg-rose-600/50" active={fire.length>0 || activePanel==='fire'} onClick={()=>setActivePanel('fire')} />
        </div>
        <div className="col-start-1 row-start-2">
          <Orb label="Gifts" icon="🎁" color="bg-sky-600/50" active={gifts.length>0 || activePanel==='gifts'} onClick={()=>setActivePanel('gifts')} />
        </div>
        <div className="col-start-3 row-start-2">
          <Orb label="Heart" icon="❤️" color="bg-emerald-600/50" active={heart.length>0 || activePanel==='heart'} onClick={()=>setActivePanel('heart')} />
        </div>
        <div className="col-start-2 row-start-3">
          <Orb label="Hands" icon="✋" color="bg-amber-600/50" active={hands.length>0 || activePanel==='hands'} onClick={()=>setActivePanel('hands')} />
        </div>
        <div className="col-start-2 row-start-2">
          <Orb label="Journey" icon="🌱" color="bg-indigo-600/40" active={!!journey || activePanel==='journey'} onClick={()=>setActivePanel('journey')} />
        </div>
      </div>

      {/* Active panel */}
      {activePanel && (
        <div className="max-w-3xl mx-auto mt-8 p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
          {activePanel!=='journey' ? (
            <>
              <div className="mb-2 text-sm opacity-80">{whisperQs[activePanel][ Math.floor(Math.random()*whisperQs[activePanel].length) ]}</div>
              <div className="flex flex-wrap mb-3">
                {starterChips[activePanel].map(ch => (
                  <button
                    key={ch}
                    onClick={()=>addTag(activePanel, ch)}
                    className="mr-2 mb-2 px-3 py-1 rounded-full border border-white/20 hover:border-amber-400"
                  >{ch}</button>
                ))}
              </div>
              <TagInput
                value={inputVal}
                setValue={setInputVal}
                onAdd={(t)=>addTag(activePanel, t)}
                placeholder="Type a word/phrase and press Enter…"
              />
              <div className="mt-4 flex flex-wrap">
                {(activePanel==='hands'?hands:activePanel==='gifts'?gifts:activePanel==='fire'?fire:heart).map(ch => (
                  <Chip key={ch} text={ch} onRemove={()=>removeTag(activePanel, ch)} />
                ))}
              </div>
            </>
          ) : (
            <JourneyPicker journey={journey} setJourney={setJourney} vision={vision} setVision={setVision} />
          )}
        </div>
      )}

      {/* Completion strip */}
      <div className="max-w-3xl mx-auto mt-10 text-center">
        {filled ? (
          <div className="animate-pulse">
            <div className="text-lg md:text-xl mb-3">{affirm}</div>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Proceed to Dashboard →'}
            </button>
          </div>
        ) : (
          <div className="text-white/70">Touch at least one orb to continue (optional; even one word is enough).</div>
        )}
      </div>
    </div>
  )
}
