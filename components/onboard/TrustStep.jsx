'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supa';
import { createLocalPin, hasLocalPin } from '@/lib/localPin';

/** Wait for a Supabase session to exist (immediately or within a short timeout). */
async function waitForSession(ms = 8000) {
  const supabase = getSupabaseBrowser();
  // 1) Already signed in?
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  // 2) Otherwise, wait for the SIGNED_IN event
  return await new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sub?.unsubscribe();
      reject(new Error('No active session'));
    }, ms);

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' && s?.access_token && !done) {
        done = true;
        clearTimeout(timer);
        sub?.unsubscribe();
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
  const [existingPin, setExistingPin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setExistingPin(hasLocalPin());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const goNext = async () => {
    // Ensure a real Supabase session exists before navigating away
    await waitForSession();
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
      await createLocalPin(pin);
      const response = await fetch('/api/pin/set', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Could not store PIN securely.');
      }
      setExistingPin(true);
      setToast('🌿 Your voice is now sealed to this device.');
      await goNext();
    } catch (error) {
      console.error('PIN save / navigation failed:', error);
      setPinErr(error?.message || 'Could not finish trust step. Try again.');
    } finally {
      setPinBusy(false);
    }
  };

  const keepExisting = async () => {
    setPinErr(null);
    try {
      setToast('🌿 Your voice is now sealed to this device.');
      await goNext();
    } catch (error) {
      console.error('Continue with existing PIN failed:', error);
      setPinErr(error?.message || 'Could not finish trust step. Try again.');
    }
  };

  return (
    <div className="min-h-[80vh] bg-neutral-950 text-white grid place-items-center p-6">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-black/40 border border-white/10">
        {toast && (
          <div className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
            {toast}
          </div>
        )}

        <div className="text-4xl mb-2">🌳</div>
        <h2 className="text-2xl font-semibold">Welcome under the tree</h2>
        <p className="text-white/70 mt-2">
          You’ve shared your name, roots, and skills. Set a PIN so this device recognises you every time you return.
        </p>
        <p className="text-emerald-200/80 mt-4 text-sm font-medium">Your voice is sealed with a 4–8 digit PIN.</p>

        <div className="mt-6 rounded-lg border border-white/10 p-4 bg-white/5">
          <p className="text-sm text-white/80">
            The PIN never leaves this device. Use it whenever biometrics aren’t available or you want to sign in manually.
          </p>
        </div>

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

          <p className="text-xs text-white/50">The PIN stays encrypted on this device.</p>
        </form>

        {existingPin && (
          <div className="mt-6">
            <button
              type="button"
              onClick={keepExisting}
              className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/10"
            >
              Keep existing PIN → Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
