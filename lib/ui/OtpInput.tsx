// lib/ui/OtpInput.tsx
import React from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function OtpInput({ value, onChange }: Props) {
  return (
    <input
      inputMode="numeric"
      pattern="\d*"
      maxLength={6}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(digits);
      }}
      className="w-full rounded border px-3 py-2 text-center tracking-widest text-xl"
      placeholder="••••••"
      aria-label="6-digit code"
    />
  );
}
