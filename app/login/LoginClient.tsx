'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function detectMethod(input: string): 'email' | 'phone' {
  const v = input.trim();
  return v.includes('@') ? 'email' : 'phone';
}

export default function LoginClient() {
  const q = useSearchParams();
  const next = q.get('next') || '/dashboard';

  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const webAuthnAvailable =
    typeof window !== 'undefined' && 'PublicKeyCredential' in window;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const method = detectMethod(user);
    if (!user) return setErr('Enter your email or phone.');
    if (!/^\d{4,8}$/.test(pin)) return setErr('Enter a 4–8 digit PIN.');

    setBusy(true);
    setErr(null);
    try {
      const payload =
        method === 'email'
          ? { email: user.trim(), pin }
          : { phone: user.trim(), pin };

      const res = await fetch('/api/pin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 204) {
        // Session cookies already set by server; safe to redirect.
        window.location.replace(next || '/dashboard');
        return;
      }

      let message = 'Could not sign in with PIN';
      if (res.status === 401) message = 'Wrong PIN. Try again.';
      else if (res.status === 404)
        message = 'We could not find an account with that email or phone.';
      else if (res.status === 409) message = 'This account does not have a PIN yet.';
      else {
        try {
          const body = await res.clone().json();
          if (body?.error) message = body.error;
          else if (typeof body === 'string' && body) message = body;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) message = text;
        }
      }

      setErr(message);
    } catch (e: any) {
      setErr(e?.message || 'Could not sign in with PIN');
    } finally {
      setBusy(false);
    }
  }

  // NEW: Biometric / Passkey sign-in (substitutes for entering PIN)
  async function onBiometricLogin() {
    if (busy) return;
    const identifier = user.trim();
    if (!identifier) {
      setErr('Enter your email or phone first.');
      return;
    }
    if (!webAuthnAvailable) {
      setErr('This device/browser does not support biometrics here.');
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      // WebAuthn ceremony via Supabase (works for email or E.164 phone)
      const { data, error } = await supabase.auth.signInWithPasskey({ identifier });
      if (error) throw error;
      if (!data?.session) throw new Error('No active session after biometrics.');

      // Mirror SSR cookies like other auth paths
      const sync = await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      if (!sync.ok) throw new Error('Session sync failed.');

      window.location.replace(next || '/dashboard');
    } catch (e: any) {
      // Graceful UX for common WebAuthn aborts/cancellations
      const name = e?.name || '';
      if (name === 'NotAllowedError') {
        setErr('Biometric prompt was cancelled. You can try again or use your PIN.');
      } else if (
        /no passkey/i.test(e?.message) ||
        /not registered/i.test(e?.message) ||
        /unsupported/i.test(e?.message)
      ) {
        setErr('No passkey found on this device for that account. Use your PIN.');
      } else {
        setErr(e?.message || 'Biometric sign-in failed. Use your PIN.');
      }
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

          {/* NEW: Divider + Biometrics button */}
          <div className="my-2 text-center text-xs text-white/50 select-none">or</div>
          <button
            type="button"
            onClick={onBiometricLogin}
            disabled={busy || !user.trim() || !webAuthnAvailable}
            className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 disabled:opacity-50"
            title={!webAuthnAvailable ? 'Biometrics not supported on this device' : 'Use biometrics'}
          >
            {busy ? 'Checking biometrics…' : 'Use biometrics (Face/Touch/Hello)'}
          </button>

          {!webAuthnAvailable && (
            <p className="text-[11px] text-white/40 mt-1">
              Biometrics requires a modern browser/device with passkeys (WebAuthn).
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
