'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function detectMethod(input: string): 'email' | 'phone' {
  const v = input.trim();
  return v.includes('@') ? 'email' : 'phone';
}

export default function LoginClient() {
  const router = useRouter();
  const q = useSearchParams();
  const next = q.get('next') || '/dashboard';

  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const method = detectMethod(user);
    if (!user) return setErr('Enter your email or phone.');
    if (!/^\d{4,8}$/.test(pin)) return setErr('Enter a 4–8 digit PIN.');

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/pin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method, user: user.trim(), pin }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'Login failed');
      }

      // Cookies were set by the server route; just navigate.
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Could not sign in with PIN');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center bg-neutral-950 text-white p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-xl font-semibold">Sign in with PIN</h1>
        <p className="text-sm text-white/70 mt-1">
          Use your email or phone and the 4–8 digit PIN you set during Trust.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300">Email or phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com or +97798…"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">PIN (4–8 digits)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
            />
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
