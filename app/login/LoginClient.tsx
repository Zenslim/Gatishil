'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'phone' | 'email';

const LOGIN_ENDPOINT = '/api/pin/login';          // POST { method, user, pin, next }

function nepPhoneNormalize(input: string) {
  const digits = (input || '').replace(/\D/g, '');
  let num = digits;
  if (digits.startsWith('977')) num = digits.slice(3);
  num = num.slice(0, 10);
  return num ? `+977${num}` : '';
}

export default function LoginClient({ nextPath = '/dashboard' }: { nextPath?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('phone');
  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(() => {
    const pinOk = /^\d{4,8}$/.test(pin);
    if (tab === 'email') {
      const emailOk = /.+@.+\..+/.test(user);
      return pinOk && emailOk;
    }
    const phoneDigits = nepPhoneNormalize(user).replace(/\D/g, '');
    const phoneOk = phoneDigits.length === 13; // +977 + 10 digits
    return pinOk && phoneOk;
  }, [user, pin, tab]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        method: tab,
        user: tab === 'phone' ? nepPhoneNormalize(user) : user.trim().toLowerCase(),
        pin,
        next: nextPath,
      };
      const res = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Sign-in failed');
      }
      router.replace(nextPath || '/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  function onUserChange(v: string) {
    if (tab === 'phone') setUser(nepPhoneNormalize(v));
    else setUser(v);
  }

  return (
    <div className="min-h-[100dvh] bg-white text-[#0A0B0F] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white border border-black/10 shadow-2xl">
          <div className="px-6 pt-8 pb-4">
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-black/60 mt-1">Sign in with your PIN</p>
          </div>

          <div className="px-6">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/5 border border-black/10">
              <button
                onClick={() => setTab('phone')}
                className={'py-2 rounded-lg text-sm font-medium transition ' + (tab === 'phone' ? 'bg-black text-white' : 'text-black/70 hover:text-black')}>
                Phone (Nepal)
              </button>
              <button
                onClick={() => setTab('email')}
                className={'py-2 rounded-lg text-sm font-medium transition ' + (tab === 'email' ? 'bg-black text-white' : 'text-black/70 hover:text-black')}>
                Email
              </button>
            </div>
          </div>

          <form className="px-6 pt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">
                {tab === 'phone' ? 'Mobile Number (+977 only)' : 'Email'}
              </label>
              <input
                inputMode={tab === 'phone' ? 'numeric' : 'email'}
                placeholder={tab === 'phone' ? '+97798XXXXXXXX' : 'you@example.com'}
                value={user}
                onChange={(e) => onUserChange(e.target.value)}
                className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 outline-none focus:border-black/40"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-black/60 mb-2">PIN (4–8 digits)</label>
              <input
                inputMode="numeric"
                pattern="\d{4,8}"
                maxLength={8}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 outline-none focus:border-black/40 tracking-widest"
              />
              <p className="text-xs text-black/40 mt-1">The PIN you set in onboarding.</p>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={!valid || loading}
              className="w-full rounded-xl bg-black text-white py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="flex justify-between text-sm text-black/60 py-4">
              <a href="/forgot-pin" className="hover:text-black">Forgot PIN?</a>
              <a href="/join" className="hover:text-black">New here? Create account</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
