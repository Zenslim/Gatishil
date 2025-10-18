'use client';
import { useEffect, useRef } from 'react';
import '@/styles/otp.css';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
};

export default function OtpInput({ value, onChange, length = 6 }: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handle = (i: number, ch: string) => {
    const v = (value + ' '.repeat(length)).slice(0, length).split('');
    v[i] = ch.replace(/\D/g, '');
    const nv = v.join('').slice(0, length);
    onChange(nv);
    if (ch && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="otp-wrap">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          className="otp-cell"
          value={value[i] ?? ''}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
        />
      ))}
    </div>
  );
}
