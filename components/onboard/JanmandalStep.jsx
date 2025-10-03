"use client";
import React from "react";
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

export default function JanmandalStep({ onDone }) {
  const [activePanel, setActivePanel] = React.useState(null); // 'hands' | 'gifts' | 'fire' | 'heart' | null
  const [fire, setFire] = React.useState([]);
  const [gifts, setGifts] = React.useState([]);
  const [heart, setHeart] = React.useState([]);
  const [hands, setHands] = React.useState([]);
  const [journey, setJourney] = React.useState("");
  const [vision, setVision] = React.useState("");
  const [whisperIndex, setWhisperIndex] = React.useState(0);
  const [revealProceed, setRevealProceed] = React.useState(false);

  const whisperQs = {
    fire: [
      "What lights you up right now?",
      "When do you feel most alive?",
      "What would you do even without applause?",
    ],
    gifts: [
      "What comes naturally to you?",
      "What do others thank you for?",
      "Where do you shine without trying?",
    ],
    heart: [
      "What do you care deeply about?",
      "Whose story moves you to act?",
      "What change do you long to see?",
    ],
    hands: [
      "Where can you help today?",
      "What needs your hands nearby?",
      "What small act moves things forward?",
    ],
  };

  // Rotate whisper question every 8s while a panel is open
  React.useEffect(() => {
    if (!activePanel || !whisperQs[activePanel]) return;
    const interval = setInterval(() => {
      setWhisperIndex((i) => (i + 1) % whisperQs[activePanel].length);
    }, 8000);
    return () => clearInterval(interval);
  }, [activePanel]);

  const anyFilled =
    (fire && fire.length > 0) ||
    (gifts && gifts.length > 0) ||
    (heart && heart.length > 0) ||
    (hands && hands.length > 0) ||
    (journey && journey.trim().length > 0);

  // After first fill, reveal Proceed shortly after affirmation overlay appears
  React.useEffect(() => {
    if (!anyFilled) return;
    const t = setTimeout(() => setRevealProceed(true), 1200);
    return () => clearTimeout(t);
  }, [anyFilled]);

  // Simple tag togglers (UI only; saving logic intentionally unchanged/omitted)
  const toggleTag = (bucket, setBucket, tag) => {
    setBucket((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      return [...prev, tag];
    });
  };

  const orbDefs = {
    fire: { x: 50, y: 16, color: "from-orange-500 to-rose-500" },
    gifts: { x: 82, y: 50, color: "from-emerald-400 to-lime-400" },
    hands: { x: 50, y: 84, color: "from-sky-400 to-indigo-500" },
    heart: { x: 18, y: 50, color: "from-pink-500 to-fuchsia-500" },
  };

  const isFilled = {
    fire: fire.length > 0,
    gifts: gifts.length > 0,
    hands: hands.length > 0,
    heart: heart.length > 0,
  };

  const center = { x: 50, y: 50 };

  const panelFor = (key) => {
    const palette = {
      fire: "bg-gradient-to-br from-orange-950/60 to-rose-900/30",
      gifts: "bg-gradient-to-br from-emerald-950/60 to-lime-900/30",
      hands: "bg-gradient-to-br from-sky-950/60 to-indigo-900/30",
      heart: "bg-gradient-to-br from-fuchsia-950/60 to-pink-900/30",
    }[key];
    const title = {
      fire: "Fire",
      gifts: "Gifts",
      hands: "Hands",
      heart: "Heart",
    }[key];
    const choices = {
      fire: ["Curiosity", "Adventure", "Mastery", "Play"],
      gifts: ["Mentoring", "Design", "Writing", "Analysis"],
      hands: ["Help a neighbor", "Join a team", "Fix a bug", "Show up"],
      heart: ["Community", "Education", "Health", "Nature"],
    }[key];
    const stateMap = {
      fire: [fire, setFire],
      gifts: [gifts, setGifts],
      hands: [hands, setHands],
      heart: [heart, setHeart],
    };
    const [vals, setter] = stateMap[key] || [[], () => {}];

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25 }}
        className={`rounded-2xl p-4 md:p-5 ${palette} border border-white/10`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white/90">{title}</h3>
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="px-3 py-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="mt-2 text-sm text-white/70 min-h-[24px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${key}-${whisperIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {whisperQs[key][whisperIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleTag(vals, setter, c)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                vals.includes(c)
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full text-white">
      <div className="relative mx-auto w-full max-w-3xl aspect-square">
        {/* Cosmic background */}
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-black via-[#0b0d1a] to-indigo-950 overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.25), transparent 40%), radial-gradient(ellipse at 70% 80%, rgba(147,51,234,0.25), transparent 35%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "3px 3px", opacity: 0.15 }} />
        </div>

        {/* SVG spokes from center to orbs */}
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Object.entries(orbDefs).map(([k, pos]) => {
            const bright = k === "fire" ? isFilled.fire : k === "gifts" ? isFilled.gifts : k === "hands" ? isFilled.hands : isFilled.heart;
            return (
              <line
                key={`ln-${k}`}
                x1={center.x}
                y1={center.y}
                x2={pos.x}
                y2={pos.y}
                stroke={bright ? "rgba(199,210,254,0.85)" : "rgba(148,163,184,0.35)"}
                strokeWidth={bright ? 0.8 : 0.5}
                strokeLinecap="round"
                style={{ filter: bright ? "drop-shadow(0 0 3px rgba(129,140,248,0.7))" : "none" }}
              />
            );
          })}
          {/* center point */}
          <circle cx={center.x} cy={center.y} r={1.2} fill={anyFilled ? "#a5b4fc" : "#64748b"} />
        </svg>

        {/* Center pulsing aura when something is filled */}
        <AnimatePresence>
          {anyFilled && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-indigo-500/15"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orbs */}
        {Object.entries(orbDefs).map(([key, pos]) => {
          const active = activePanel === key;
          const filled = isFilled[key];
          return (
            <motion.button
              key={`orb-${key}`}
              type="button"
              onClick={() => setActivePanel(active ? null : key)}
              initial={false}
              animate={{
                scale: active ? 1.12 : 1,
                boxShadow: filled
                  ? "0 0 0 6px rgba(255,255,255,0.06), 0 0 30px rgba(167,139,250,0.35)"
                  : "0 0 0 4px rgba(255,255,255,0.04)",
              }}
              whileHover={{ scale: 1.06 }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-0.5`} 
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <motion.div
                className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br ${pos.color} relative overflow-hidden`}
                animate={{ boxShadow: filled ? "0 0 40px rgba(129,140,248,0.35)" : "0 0 20px rgba(255,255,255,0.12)" }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: active ? 0.5 : 0.3, scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 55%)" }}
                />
                <div className="absolute inset-0 grid place-items-center text-sm font-medium">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
              </motion.div>
            </motion.button>
          );
        })}

        {/* Floating panel */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[92%] md:w-4/5">
          <AnimatePresence mode="wait">
            {activePanel && panelFor(activePanel)}
          </AnimatePresence>
        </div>

        {/* Journey and Vision inputs (simple inline at top-left/right) */}
        <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            value={journey}
            onChange={(e) => setJourney(e.target.value)}
            placeholder="Your journey (one line)"
            className="w-full md:w-[48%] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <input
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="A small vision or next step"
            className="w-full md:w-[48%] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Affirmation overlay */}
        <AnimatePresence>
          {anyFilled && (
            <motion.div
              key="affirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center pointer-events-none"
            >
              <motion.div
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-white/80 text-sm backdrop-blur-sm"
              >
                Noted. Little sparks become constellations.
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Proceed button */}
      <div className="mt-6 flex justify-center">
        <AnimatePresence>
          {revealProceed && (
            <motion.button
              key="proceed"
              type="button"
              onClick={() => (typeof onDone === "function" ? onDone() : null)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
            >
              Proceed
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
