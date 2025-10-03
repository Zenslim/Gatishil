import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** -------------------------------------------------------
 *  Simple starry cosmic backdrop
 * ------------------------------------------------------*/
const StarBackdrop = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-b from-black to-indigo-950 opacity-95" />
    <div
      className="absolute inset-0 mix-blend-screen opacity-30"
      style={{
        backgroundImage:
          'radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)',
        backgroundSize: '3px 3px, 2px 2px',
        backgroundPosition: '0 0, 1px 1px',
      }}
    />
  </div>
);

/** -------------------------------------------------------
 *  Mandala lines (center → orbs) with center glow
 * ------------------------------------------------------*/
function MandalaLines({ hasFire, hasGifts, hasHeart, hasHands, hasJourney, positions }) {
  const center = { x: positions.center.x, y: positions.center.y };
  const mkLine = (pt, active, key) => (
    <line
      key={key}
      x1={center.x}
      y1={center.y}
      x2={pt.x}
      y2={pt.y}
      stroke={active ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.15)'}
      strokeWidth={active ? 2.5 : 1.2}
      strokeLinecap="round"
    />
  );
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden>
      {mkLine(positions.fire, hasFire, 'fire')}
      {mkLine(positions.gifts, hasGifts, 'gifts')}
      {mkLine(positions.heart, hasHeart, 'heart')}
      {mkLine(positions.hands, hasHands, 'hands')}
      {mkLine(positions.journey, hasJourney, 'journey')}
      {/* center glow */}
      <circle
        cx={center.x}
        cy={center.y}
        r={hasFire || hasGifts || hasHeart || hasHands || hasJourney ? 22 : 12}
        fill="url(#glowGrad)"
        opacity="0.9"
      />
      <defs>
        <radialGradient id="glowGrad">
          <stop offset="0%" stopColor="rgba(251,191,36,1)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** -------------------------------------------------------
 *  Animated Orb button
 * ------------------------------------------------------*/
function MotionOrb({ label, icon, active, filled, onClick, style }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="rounded-full w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shadow-lg ring-2 ring-white/20 bg-white/5 backdrop-blur relative"
      style={style}
      animate={{ scale: active ? 1.08 : 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.div className="text-2xl" animate={{ opacity: filled ? 1 : 0.85 }} transition={{ duration: 0.4 }}>
        {icon}
      </motion.div>
      <motion.span className="absolute mt-20 text-xs text-white/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {label}
      </motion.span>
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

/** ======================================================
 *  MAIN COMPONENT
 * =====================================================*/
export default function JanmandalStep({ onDone }) {
  // ✅ Core UI state (this was missing)
  const [activePanel, setActivePanel] = useState(null); // 'hands' | 'gifts' | 'fire' | 'heart' | 'journey' | null
  const [fire, setFire] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [heart, setHeart] = useState([]);
  const [hands, setHands] = useState([]);
  const [journey, setJourney] = useState('');
  const [vision, setVision] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [affirm, setAffirm] = useState('Noted. Little sparks become constellations.');

  // ✅ Whisper questions + starter chips (simple defaults; tweak as you like)
  const whisperQs = {
    fire: [
      'What lights you up right now?',
      'When do you feel most alive?',
      'What would you do even without applause?',
    ],
    gifts: ['What comes naturally to you?', 'What do others thank you for?', 'Where do you shine without trying?'],
    heart: ['What do you care deeply about?', 'Whose story moves you to act?', 'What change do you long to see?'],
    hands: ['Where can you help today?', 'What needs your hands nearby?', 'What small act moves things forward?'],
  };

  const starterChips = {
    fire: ['Curiosity', 'Adventure', 'Mastery', 'Play'],
    gifts: ['Mentoring', 'Design', 'Writing', 'Analysis'],
    heart: ['Community', 'Education', 'Health', 'Nature'],
    hands: ['Help a neighbor', 'Join a team', 'Fix a bug', 'Show up'],
  };

  // ✅ Rotating whisper index (8s)
  const [whisperIdx, setWhisperIdx] = useState(0);
  useEffect(() => {
    if (!activePanel || activePanel === 'journey') return;
    const arr = whisperQs[activePanel] || [];
    if (!arr.length) return;
    const t = setInterval(() => setWhisperIdx((i) => (i + 1) % arr.length), 8000);
    return () => clearInterval(t);
  }, [activePanel]);

  // ✅ Convenience flags
  const hasFire = fire.length > 0;
  const hasGifts = gifts.length > 0;
  const hasHeart = heart.length > 0;
  const hasHands = hands.length > 0;
  const hasJourney = !!journey;
  const filled = hasFire || hasGifts || hasHeart || hasHands || hasJourney;

  // ✅ Mandala geometry (virtual 720x540 canvas)
  const positions = {
    center: { x: 360, y: 270 },
    fire: { x: 360, y: 80 }, // top
    gifts: { x: 160, y: 270 }, // left
    heart: { x: 560, y: 270 }, // right
    hands: { x: 360, y: 460 }, // bottom
    journey: { x: 360, y: 200 }, // just above center
  };

  // ✅ Add / remove tags (kept simple; replace with your original helpers if you had them)
  function addTag(bucket, tag) {
    const t = String(tag || '').trim();
    if (!t) return;
    const push = (arr, set) => (!arr.includes(t) ? set([...arr, t]) : null);
    if (bucket === 'fire') return push(fire, setFire);
    if (bucket === 'gifts') return push(gifts, setGifts);
    if (bucket === 'heart') return push(heart, setHeart);
    if (bucket === 'hands') return push(hands, setHands);
  }
  function removeTag(bucket, tag) {
    const drop = (arr, set) => set(arr.filter((x) => x !== tag));
    if (bucket === 'fire') return drop(fire, setFire);
    if (bucket === 'gifts') return drop(gifts, setGifts);
    if (bucket === 'heart') return drop(heart, setHeart);
    if (bucket === 'hands') return drop(hands, setHands);
  }

  // ✅ Save (kept minimal to avoid breaking your flow)
  async function save() {
    try {
      setSaving(true);
      // TODO: If you had Supabase save here, paste it back in:
      // await supabase.from('profiles').update({ hands, gifts, fire, heart, journey, vision }).eq('id', user.id);
      if (typeof onDone === 'function') onDone();
    } finally {
      setSaving(false);
    }
  }

  // ✅ Whisper question renderer
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
              hasFire={hasFire}
              hasGifts={hasGifts}
              hasHeart={hasHeart}
              hasHands={hasHands}
              hasJourney={hasJourney}
              positions={positions}
            />

            {/* Orbs (absolute positions) */}
            {[
              { key: 'fire', x: positions.fire.x, y: positions.fire.y, icon: '🔥', label: 'अग्नि', active: activePanel === 'fire', filled: hasFire },
              { key: 'gifts', x: positions.gifts.x, y: positions.gifts.y, icon: '🎁', label: 'जल', active: activePanel === 'gifts', filled: hasGifts },
              { key: 'heart', x: positions.heart.x, y: positions.heart.y, icon: '❤️', label: 'वायु', active: activePanel === 'heart', filled: hasHeart },
              { key: 'hands', x: positions.hands.x, y: positions.hands.y, icon: '✋', label: 'पृथ्वी', active: activePanel === 'hands', filled: hasHands },
              { key: 'journey', x: positions.journey.x, y: positions.journey.y, icon: '🌱', label: 'आकाश', active: activePanel === 'journey', filled: hasJourney },
            ].map((o) => (
              <div
                key={o.key}
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  transform: `translate(${(o.x / 720) * 100}% , ${(o.y / 540) * 100}%) translate(-50%,-50%)`,
                }}
              >
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
              <div
                className="w-full h-full rounded-full"
                style={{ boxShadow: filled ? '0 0 40px 14px rgba(251,191,36,0.45)' : 'none' }}
              />
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
                    {(starterChips[activePanel] || []).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => addTag(activePanel, ch)}
                        className="mr-2 mb-2 px-3 py-1 rounded-full border border-white/20 hover:border-amber-400"
                      >
                        {ch}
                      </button>
                    ))}
                  </div>

                  {/* Simple input line to add a tag (press Enter) */}
                  <input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag(activePanel, inputVal);
                        setInputVal('');
                      }
                    }}
                    placeholder="Type a word/phrase and press Enter…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />

                  {/* Chips */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(activePanel === 'hands'
                      ? hands
                      : activePanel === 'gifts'
                      ? gifts
                      : activePanel === 'fire'
                      ? fire
                      : heart
                    ).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => removeTag(activePanel, ch)}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm hover:bg-white/15"
                        title="Remove"
                      >
                        {ch} ✕
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid gap-3">
                  <input
                    value={journey}
                    onChange={(e) => setJourney(e.target.value)}
                    placeholder="Your journey (one line)…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                  <input
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    placeholder="A small vision or next step…"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setActivePanel('')} className="text-white/70 hover:text-white text-sm">
                  Close
                </button>
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
