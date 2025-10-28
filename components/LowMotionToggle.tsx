'use client';
import { useEffect, useState } from 'react';

export default function LowMotionToggle() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setLow(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <span
      className={`rounded-xl border px-3 py-1.5 text-xs select-none
        ${low ? 'border-white/15 bg-white/5 text-slate-200/70' : 'border-white/15 bg-white/5 text-slate-200/90'}`}
      title="System motion preference"
    >
      🫧 Motion: {low ? 'Low' : 'Full'}
    </span>
  );
}
