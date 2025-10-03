"use client";
import React, { useState, useEffect } from 'react';
// add near the top with your other imports:
import { motion, AnimatePresence } from 'framer-motion'

// Utility: simple starry background
const StarBackdrop = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-b from-black to-indigo-950 opacity-95" />
    <div className="absolute inset-0 mix-blend-screen opacity-30"
         style={{
           backgroundImage:
             'radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)',
           backgroundSize: '3px 3px, 2px 2px',
           backgroundPosition: '0 0, 1px 1px'
         }} />
  </div>
);

// SVG Mandala lines (center → each orb)
function MandalaLines({ hasFire, hasGifts, hasHeart, hasHands, hasJourney, positions }) {
  // positions: {fire:{x,y}, gifts:{x,y}, heart:{x,y}, hands:{x,y}, journey:{x,y}} in px relative to container
  const center = { x: positions.center.x, y: positions.center.y };
  const mkLine = (pt, active) => (
    <line
      key={pt.key}
      x1={center.x} y1={center.y}
      x2={pt.x} y2={pt.y}
      stroke={active ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.15)'}
      strokeWidth={active ? 2.5 : 1.2}
      strokeLinecap="round"
    />
  );
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden>
      {mkLine({key:'fire',   ...positions.fire},   hasFire)}
      {mkLine({key:'gifts',  ...positions.gifts},  hasGifts)}
      {mkLine({key:'heart',  ...positions.heart},  hasHeart)}
      {mkLine({key:'hands',  ...positions.hands},  hasHands)}
      {mkLine({key:'journey',...positions.journey},hasJourney)}
      {/* center glow */}
      <circle cx={center.x} cy={center.y} r={hasFire||hasGifts||hasHeart||hasHands||hasJourney ? 22 : 12}
              fill="url(#glowGrad)" opacity="0.9" />
      <defs>
        <radialGradient id="glowGrad">
          <stop offset="0%" stopColor="rgba(251,191,36,1)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Reusable animated Orb
function MotionOrb({ label, icon, active, filled, onClick, style }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="rounded-full w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shadow-lg ring-2 ring-white/20 bg-white/5 backdrop-blur"
      style={style}
      animate={{ scale: active ? 1.08 : 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.div
        className="text-2xl"
        animate={{ opacity: filled ? 1 : 0.8 }}
        transition={{ duration: 0.4 }}
      >
        {icon}
      </motion.div>
      <motion.span
        className="absolute mt-20 text-xs text-white/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {label}
      </motion.span>
      {/* soft glow ring when filled */}
      {filled && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: '110%', height: '110%', boxShadow: '0 0 30px 6px rgba(251,191,36,0.55)' }}
          initial={{ opacity: 0.0 }}
          animate={{ opacity: 1.0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
}

export default function JanmandalStep({ onDone }){
  // keep your original state + hooks (hands,gifts,fire,heart,journey,vision,activePanel, inputVal, saving, affirm, etc.)
  // ... your existing state + effects remain ...

  // Rotating whisper index
  const [whisperIdx, setWhisperIdx] = useState(0);
  useEffect(() => {
    if (!activePanel || activePanel === 'journey') return;
    const arr = whisperQs[activePanel] || [];
    if (!arr.length) return;
    const t = setInterval(() => setWhisperIdx(i => (i + 1) % arr.length), 8000);
    return () => clearInterval(t);
  }, [activePanel]);

  const hasFire   = fire.length   > 0;
  const hasGifts  = gifts.length  > 0;
  const hasHeart  = heart.length  > 0;
  const hasHands  = hands.length  > 0;
  const hasJourney= !!journey;

  const filled = hasFire || hasGifts || hasHeart || hasHands || hasJourney;

  // absolute positions inside a 720x540 area; scale by container via transform
  const positions = {
    center:  { x: 360, y: 270 },
    fire:    { x: 360, y: 80  },      // top
    gifts:   { x: 160, y: 270 },      // left
    heart:   { x: 560, y: 270 },      // right
    hands:   { x: 360, y: 460 },      // bottom
    journey: { x: 360, y: 200 }       // just above center
  };

  const Question = () => {
    if (!activePanel || activePanel === 'journey') return null;
    const arr = whisperQs[activePanel] || [];
    if (!arr.length) return null;
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={whisperIdx}
          className="mb-3 text-sm text-white/80"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {arr[whisperIdx]}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="relative min-h-[86vh] w-full text-white overflow-hidden">
      <StarBackdrop />

      <div className="relative max-w-5xl mx-auto pt-8 px-4">
        <h1 className="text-center text-2xl md:text-3xl font-semibold">Janmandal — Soul Imprint</h1>
        <p className="text-center text-white/80 mt-1">Touch any orb. Whisper a few words. No pressure.</p>

        {/* Mandala stage (fixed 720x540 canvas scaled responsively) */}
        <div className="relative mx-auto mt-8" style={{ width: '100%', maxWidth: 720 }}>
          <div className="relative" style={{ paddingTop: '75%' /* 540/720 */ }}>
            {/* SVG lines and center glow */}
            <MandalaLines
              hasFire={hasFire} hasGifts={hasGifts} hasHeart={hasHeart} hasHands={hasHands} hasJourney={hasJourney}
              positions={positions}
            />

            {/* Orbs (absolute, positioned by transform from 720x540 space) */}
            {/* A helper to place elements: */}
            {[
              {key:'fire',   x:positions.fire.x,   y:positions.fire.y,   icon:'🔥', label:'अग्नि',  active: activePanel==='fire',   filled: hasFire},
              {key:'gifts',  x:positions.gifts.x,  y:positions.gifts.y,  icon:'🎁', label:'जल',    active: activePanel==='gifts',  filled: hasGifts},
              {key:'heart',  x:positions.heart.x,  y:positions.heart.y,  icon:'❤️', label:'वायु',  active: activePanel==='heart',  filled: hasHeart},
              {key:'hands',  x:positions.hands.x,  y:positions.hands.y,  icon:'✋', label:'पृथ्वी', active: activePanel==='hands',  filled: hasHands},
              {key:'journey',x:positions.journey.x,y:positions.journey.y,icon:'🌱', label:'आकाश',  active: activePanel==='journey',filled: hasJourney},
            ].map(o => (
              <div key={o.key}
                   className="absolute"
                   style={{
                     left: 0, top: 0, width: '100%', height: '100%',
                     transform: `translate(${(o.x/720)*100}% , ${(o.y/540)*100}%) translate(-50%,-50%)`
                   }}>
                <MotionOrb
                  label={o.label}
                  icon={o.icon}
                  active={o.active}
                  filled={o.filled}
                  onClick={() => setActivePanel(o.key)}
                />
              </div>
            ))}

            {/* Center subtle breathing if filled */}
            <motion.div
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{ width: 24, height: 24, transform: 'translate(-50%,-50%)' }}
              animate={filled ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-full h-full rounded-full" style={{ boxShadow: filled ? '0 0 40px 14px rgba(251,191,36,0.45)' : 'none' }} />
            </motion.div>
          </div>
        </div>

        {/* Active Panel (card) */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              className="max-w-3xl mx-auto mt-8 p-5 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activePanel !== 'journey' ? (
                <>
                  <Question />
                  <div className="flex flex-wrap mb-3">
                    {starterChips[activePanel].map(ch => (
                      <button
                        key={ch}
                        onClick={() => addTag(activePanel, ch)}
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
              <div className="flex justify-end mt-4">
                <button onClick={()=>setActivePanel('')} className="text-white/70 hover:text-white text-sm">Close</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion strip with affirmation overlay */}
        <div className="relative max-w-3xl mx-auto mt-10 text-center">
          <AnimatePresence>
            {filled && (
              <motion.div
                key="affirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                <div className="text-lg md:text-xl">{affirm}</div>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-70"
                >
                  {saving ? 'Saving…' : 'Proceed to Dashboard →'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {!filled && (
            <div className="text-white/70">Touch at least one orb to continue (even one word is enough).</div>
          )}
        </div>
      </div>
    </div>
  );
}
