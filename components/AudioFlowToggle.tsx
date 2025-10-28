'use client';
import { useAudioFlow } from '@/lib/useAudioFlow';
import { useEffect, useState } from 'react';

export default function AudioFlowToggle() {
  const { enabled, toggle, bootable } = useAudioFlow();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      aria-label="Flow Mode"
      onClick={toggle}
      disabled={!bootable}
      className={`rounded-xl border px-3 py-1.5 text-xs transition
        ${enabled ? 'border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border-white/15 bg-white/5 text-slate-200/90'}
        ${!bootable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
      title={enabled ? 'Flow Mode: ON' : 'Flow Mode: OFF'}
    >
      🌐 {mounted ? (enabled ? 'Flow: ON' : 'Flow: OFF') : 'Flow'}
    </button>
  );
}
