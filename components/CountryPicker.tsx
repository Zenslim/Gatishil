'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CountryDial } from '@/app/data/countries';
import { COUNTRIES } from '@/app/data/countries';

type Props = {
  open: boolean;
  onClose: () => void;
  value: CountryDial | null;
  onChange: (c: CountryDial) => void;
};

export default function CountryPicker({ open, onClose, value, onChange }: Props) {
  const [q, setQ] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      // focus search on open
      setTimeout(() => inputRef.current?.focus(), 0);
      // basic focus trap
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (`+${c.dial}`).includes(term) ||
      c.dial.includes(term)
    );
  }, [q]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* sheet/card */}
      <div className="relative w-full md:max-w-md md:rounded-2xl bg-slate-900 border border-white/10 shadow-xl
                      p-4 md:p-5 translate-y-0 md:translate-y-0 rounded-t-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200">Select Country</h2>
          <button onClick={onClose} aria-label="Close"
                  className="px-2 py-1 rounded-md hover:bg-white/10">✕</button>
        </div>

        <div className="mb-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search country or dial code"
            className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
          {filtered.map((c) => {
            const selected = value?.dial === c.dial;
            return (
              <button
                key={`${c.dial}-${c.name}`}
                onClick={() => { onChange(c); onClose(); }}
                className={"w-full flex items-center justify-between px-2 py-3 text-left hover:bg-white/5 " +
                           (selected ? "bg-white/10" : "")}
                aria-label={`${c.name} plus ${c.dial}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-slate-200">{c.name}</span>
                </div>
                <span className="text-slate-400">+{c.dial}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-slate-400">No matches</div>
          )}
        </div>
      </div>
    </div>
  );
}
