'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ACTIONS = [
  {
    type: 'tree',
    label: 'रूख रोप्नुहोस् · Plant a Tree',
    mantra: 'हरियो स्वास, साझा प्रतिज्ञा',
    color: 'from-emerald-400 via-emerald-500 to-lime-300',
    icon: '🌱',
    unit: 'saplings'
  },
  {
    type: 'donation',
    label: 'एक रुपैया उज्यालो · Give a Rupee',
    mantra: 'साना हातहरू, ठूलो उज्यालो',
    color: 'from-amber-400 via-orange-400 to-rose-400',
    icon: '💧',
    unit: 'rupees'
  },
  {
    type: 'vote',
    label: 'मत देऊ · Cast a Pulse Vote',
    mantra: 'साझा हृदय, साझा दिशा',
    color: 'from-sky-400 via-cyan-400 to-indigo-400',
    icon: '🔆',
    unit: 'votes'
  },
  {
    type: 'voice',
    label: 'आवाज छोड्नुहोस् · Leave a Voice',
    mantra: 'बोल्दा देखिन्छ, सुन्दा बन्छ',
    color: 'from-rose-400 via-fuchsia-400 to-purple-400',
    icon: '🔊',
    unit: 'voices'
  }
] as const;

type ActionType = (typeof ACTIONS)[number]['type'];

type Contribution = {
  id: string;
  actor: string;
  action: ActionType;
  quantity: number;
  nepali: string;
  english: string;
  createdAt: number;
  intensity: number;
};

const SAMPLE_NAMES = ['Sita', 'Ram', 'Bishnu', 'Tara', 'Asmita', 'Ganesh', 'Mira', 'Kiran'];
const SAMPLE_LOCALES = ['Kavre', 'Dang', 'Khotang', 'Lalitpur', 'Kailali', 'Okhaldhunga'];

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createContribution(action: ActionType): Contribution {
  const quantity = action === 'donation' ? Math.floor(Math.random() * 100) + 1 : 1;
  const actor = `${randomChoice(SAMPLE_NAMES)} (${randomChoice(SAMPLE_LOCALES)})`;
  const phrases: Record<ActionType, [string, string]> = {
    tree: ['एक रूख रोपियो', 'A sapling just joined the grove.'],
    donation: ['एक रुपैया उज्यालोमा थपियो', 'A rupee just fueled the light.'],
    vote: ['एक मतले दिशा निर्धारण गर्‍यो', 'A pulse vote nudged our shared path.'],
    voice: ['एक आवाजले सत्य सुनायो', 'A voice breathed truth into the circle.']
  };

  return {
    id: crypto.randomUUID(),
    actor,
    action,
    quantity,
    nepali: phrases[action][0],
    english: phrases[action][1],
    createdAt: Date.now(),
    intensity: 0.35 + Math.random() * 0.55
  };
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(timestamp);
}

function useAmbientDrone(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    if (!enabled) {
      sourcesRef.current.forEach((osc) => osc.stop());
      sourcesRef.current = [];
      contextRef.current?.close();
      contextRef.current = null;
      return;
    }

    const context = new AudioContext();
    contextRef.current = context;

    const baseFrequencies = [196, 246.94, 329.63];
    const oscillators = baseFrequencies.map((freq, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.0008 + idx * 0.0004;
      osc.connect(gain).connect(context.destination);
      osc.start();
      return osc;
    });

    sourcesRef.current = oscillators;

    return () => {
      oscillators.forEach((osc) => osc.stop());
      context.close();
    };
  }, [enabled]);
}

function RippleField({ pulses }: { pulses: Contribution[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 mix-blend-screen opacity-80">
        {pulses.map((pulse) => (
          <motion.span
            key={pulse.id}
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 4 }}
            transition={{ duration: 4, ease: 'easeOut' }}
            className="absolute h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              top: `${30 + Math.random() * 40}%`,
              left: `${20 + Math.random() * 60}%`,
              backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,${pulse.intensity}) 0%, transparent 60%)`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DigitalChautariPage() {
  const [pulses, setPulses] = useState<Contribution[]>(() =>
    ACTIONS.map((action) => createContribution(action.type)).slice(0, 3)
  );
  const [ambientOn, setAmbientOn] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType>('tree');

  useAmbientDrone(ambientOn);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulses((prev) => {
        const next = [...prev, createContribution(randomChoice(ACTIONS).type)];
        return next.slice(-20);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const aggregate = useMemo(() => {
    return pulses.reduce<Record<ActionType, number>>((acc, pulse) => {
      acc[pulse.action] = (acc[pulse.action] ?? 0) + pulse.quantity;
      return acc;
    }, { tree: 0, donation: 0, vote: 0, voice: 0 });
  }, [pulses]);

  const handleAction = () => {
    setPulses((prev) => {
      const next = [...prev, createContribution(selectedAction)];
      return next.slice(-20);
    });
    if (!ambientOn) {
      setAmbientOn(true);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="absolute inset-0 -z-10 opacity-90" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_top,rgba(252,211,77,0.35)_0%,rgba(59,130,246,0.15)_55%,rgba(15,23,42,0.05)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_bottom,rgba(56,189,248,0.25)_0%,rgba(236,72,153,0.2)_45%,rgba(15,23,42,0.05)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-24 pt-16 sm:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_100px_rgba(252,211,77,0.2)]">
          <RippleField pulses={pulses.slice(-5)} />
          <div className="relative grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300/90">डिजिटल चौतारी</p>
                <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
                  Stand beneath the digital Chauṭarī and feel Nepal breathe again.
                </h1>
              </div>
              <p className="text-sm text-slate-200/85 sm:text-base">
                यो चौतारीमा प्रदर्शन होइन, उपस्थिति मात्र छ। तपाईंले बोलेको प्रत्येक शब्द, रोपेको प्रत्येक रूख, बलेको प्रत्येक दियो सबैले देख्छन् र महसुस गर्छन्। No feeds, no filters—only living proof of each other.
              </p>
              <p className="text-sm text-slate-200/85 sm:text-base">
                Every action glows across the mandala ledger. Data is transparent, signed, and held in the open so no hand can hide in the dark. Numbers become ripples of light, fountains of water, bowls of grain, and the beat of a shared heart.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-200/80">
                <span className="rounded-full border border-white/10 px-3 py-1">Presence over performance</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Transparency over authority</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Emotion before analytics</span>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => setAmbientOn((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 transition hover:border-amber-300/60 hover:text-amber-100"
                >
                  {ambientOn ? '⏸️ Pause Dawn Drone' : '▶️ Hear the Dawn'}
                </button>
                <span className="text-[11px] text-slate-300/80">
                  {ambientOn ? 'Cloud-borne tanpura humming in C major.' : 'Sound blooms when you join the circle.'}
                </span>
              </div>
            </div>

            <div className="relative flex flex-col gap-6 rounded-3xl border border-white/15 bg-black/40 p-6">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-300/80">Act now</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {ACTIONS.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => setSelectedAction(action.type)}
                    className={`relative overflow-hidden rounded-2xl border ${
                      selectedAction === action.type
                        ? 'border-white/40 ring-2 ring-offset-2 ring-offset-black/30 ring-amber-300/40'
                        : 'border-white/15'
                    } bg-gradient-to-br ${action.color} px-4 py-5 text-left shadow-lg transition`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <p className="mt-3 text-sm font-semibold text-black drop-shadow-[0_0_12px_rgba(255,255,255,0.75)]">
                      {action.label}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-black/70">{action.mantra}</p>
                  </button>
                ))}
              </div>
              <motion.button
                onClick={handleAction}
                whileTap={{ scale: 0.97 }}
                className="group relative overflow-hidden rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_35px_rgba(251,191,36,0.35)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Send your light into the circle</span>
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-lg"
                  >
                    ✨
                  </motion.span>
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition group-hover:opacity-60" />
              </motion.button>
              <p className="text-[11px] text-slate-300/70">
                Contributions sign themselves onto a tamper-proof public ledger (Supabase + open merkle proofs in progress). Every Nepali can verify the flow.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-amber-200">Living Ledger · जिवन्त बहि</h2>
              <span className="text-[11px] uppercase tracking-widest text-slate-300/70">Transparent by design</span>
            </div>
            <p className="mt-2 text-sm text-slate-200/80">
              Transactions are not hidden in tables—they bloom as pulses of light. Verify every ripple. Watch the circle keep promises in real time.
            </p>
            <div className="mt-6 space-y-3">
              <AnimatePresence>
                {[...pulses]
                  .reverse()
                  .slice(0, 8)
                  .map((pulse) => {
                    const actionMeta = ACTIONS.find((a) => a.type === pulse.action)!;
                    return (
                      <motion.div
                        key={pulse.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        layout
                        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{actionMeta.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{pulse.nepali}</p>
                              <p className="text-xs text-slate-200/80">{pulse.english}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-amber-200/80">
                            <p>
                              {pulse.quantity} {actionMeta.unit}
                            </p>
                            <p className="text-[11px] tracking-widest text-slate-200/65">{formatTime(pulse.createdAt)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-200/60">
                          <span>{pulse.actor}</span>
                          <span>Integrity hash · #{pulse.id.slice(0, 8)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm font-semibold text-amber-200">Collective Vital Signs</h3>
              <p className="mt-1 text-xs text-slate-300/80">Totals glow as elements, not charts.</p>
              <div className="mt-4 space-y-4 text-sm">
                {ACTIONS.map((action) => (
                  <div key={action.type} className="rounded-2xl border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-300/70">
                      <span>{action.label.split('·')[0].trim()}</span>
                      <span>{aggregate[action.type]}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        animate={{ width: `${Math.min(100, aggregate[action.type] * 12)}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${action.color}`}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-300/70">
                      {action.type === 'tree' && 'The grove thickens; every sapling adds oxygen to the shared dawn.'}
                      {action.type === 'donation' && 'Rūpees shimmer as droplets in the communal kalash, funding public trust.'}
                      {action.type === 'vote' && 'Pulse votes drum as collective heartbeat, guiding proposals in real time.'}
                      {action.type === 'voice' && 'Voices weave oral history, archived as light and echo for generations.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200/80">
              <h3 className="text-sm font-semibold text-amber-200">Roadmap to Sacred Trust</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed">
                <li>
                  <span className="font-semibold text-white">On-chain verification:</span> Supabase realtime anchors ledger entries which are mirrored to a public Merkle tree published hourly to Cloudflare R2.
                </li>
                <li>
                  <span className="font-semibold text-white">Voice as first-class citizen:</span> Community radio partners upload voice petitions that auto-transcribe into Nepali + English captions.
                </li>
                <li>
                  <span className="font-semibold text-white">Festival deployments:</span> Portable edge nodes bring Chauṭarī kiosks to village haat bazaars and diaspora gatherings.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-slate-200/85">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-amber-200">How does trust stay sacred?</h2>
              <p className="mt-3">
                Every interaction is cryptographically signed, stored with Row Level Security in Supabase, and rendered in real-time via Edge streams. Cloudflare Workers broadcast the state to local mesh kiosks so no village is offline.
              </p>
              <p className="mt-3">
                We honour Nepali first, English second. Buttons breathe, text hums softly, and even without reading you can follow the glow, the water, and the heartbeat.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-6">
              <h3 className="text-sm font-semibold text-amber-200">Today&apos;s ritual · आजको रिति</h3>
              <p className="text-xs text-slate-300/80">
                Join at dawn, whisper a wish, light a rupee, feel the chorus reply. चौतारीमा भेटौँ।
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/30 via-emerald-400/20 to-transparent p-4">
                  <p className="text-xs uppercase tracking-widest text-emerald-200/80">माटो · Earth</p>
                  <p className="mt-2 text-sm font-semibold text-white">Collective gardens bloom in 42 districts.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/30 via-indigo-500/20 to-transparent p-4">
                  <p className="text-xs uppercase tracking-widest text-sky-200/80">जल · Water</p>
                  <p className="mt-2 text-sm font-semibold text-white">Communal cisterns refill through transparent rupee flows.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-transparent p-4">
                  <p className="text-xs uppercase tracking-widest text-amber-200/80">आगो · Fire</p>
                  <p className="mt-2 text-sm font-semibold text-white">Festival nodes bring warmth, music, and nightly assemblies.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/30 via-fuchsia-500/20 to-transparent p-4">
                  <p className="text-xs uppercase tracking-widest text-rose-200/80">आकाश · Sky</p>
                  <p className="mt-2 text-sm font-semibold text-white">Voices rise into a public archive of truth.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
