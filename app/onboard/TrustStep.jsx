"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Read build-time feature flag
const ENABLE_TRUST_PIN = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/** Wait for a Supabase session to exist (immediately or within a short timeout). */
async function waitForSession(ms = 15000) {
  // 1) Already signed in?
  {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session;
  }

  // 2) Otherwise, wait for the SIGNED_IN event
  return await new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sub?.subscription?.unsubscribe();
      reject(new Error('No active session'));
    }, ms);

    const sub = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' && s?.access_token && !done) {
        done = true;
        clearTimeout(timer);
        sub?.subscription?.unsubscribe();
        resolve(s);
      }
    });
  });
}

export default function TrustStep({ onDone }) {
  const router = useRouter();
  const q = useSearchParams();
  const next = q.get('next') || '/dashboard';

  const [toast, setToast] = useState(null);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinErr, setPinErr] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const goNext = async () => {
    await waitForSession().catch(() => null); // ensure session exists
    router.replace(next);
    router.refresh();
    onDone?.();
  };

  const pinLengthOk = pin.length >= 4 && pin.length <= 8;

  const savePin = async (e) => {
    e.preventDefault();
    if (pinBusy) return;
    setPinErr(null);

    if (!pinLengthOk) {
      setPinErr('Use a 4–8 digit PIN.');
      return;
    }
    if (pin !== pinConfirm) {
      setPinErr('PINs do not match.');
      return;
    }

    setPinBusy(true);
    try {
      await waitForSession(); // must have OTP-created session

      const response = await fetch('/api/pin/set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session isn’t ready yet. Please wait and try again.');
        }
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Could not store PIN securely.');
      }

      setToast('Your PIN is set. Welcome.');
      await goNext();
    } catch (error) {
      console.error('TrustStep save PIN failed:', error);
      setPinErr(error?.message || 'Could not finish trust step. Try again.');
    } finally {
      setPinBusy(false);
    }
  };

  // If feature is disabled, do not change behavior—just continue.
  if (!ENABLE_TRUST_PIN) {
    return (
      <div className="min-h-[80vh] grid place-items-center p-6 text-white bg-neutral-950">
        <div className="w-full max-w-xl p-6 rounded-2xl bg-black/40 border border-white/10">
          <h2 className="text-2xl font-semibold">Welcome under the tree</h2>
          <p className="text-white/70 mt-2">
            Trust step is currently disabled. Continue to your dashboard.
          </p>
          <button
            type="button"
            onClick={goNext}
            className="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600"
          >
            Continue → Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-neutral-950 text-white grid place-items-center p-6">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-black/40 border border-white/10">
        {toast && (
          <div className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
            {toast}
          </div>
        )}

        <div className="text-4xl mb-2">🌳</div>
        <h2 className="text-2xl font-semibold">Seal your voice</h2>
        <p className="text-white/70 mt-2">
          Set a 4–8 digit PIN so this device recognises you every time you return.
        </p>

        <form className="mt-8 space-y-4" onSubmit={savePin}>
          <div>
            <label className="block text-sm font-medium text-gray-300">Create a PIN (4–8 digits)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              maxLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Confirm PIN</label>
            <input
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              maxLength={8}
              required
            />
          </div>

          {pinErr && <p className="text-sm text-red-400">{pinErr}</p>}

          <button
            type="submit"
            disabled={pinBusy}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
          >
            {pinBusy ? 'Saving…' : 'Save PIN → Continue'}
          </button>

          <p className="text-xs text-white/50 mt-2">
            We never store your PIN. It’s transformed securely server-side to a strong secret.
          </p>
        </form>
      </div>
    </div>
  );
}
