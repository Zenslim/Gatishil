'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { createLocalPin, hasLocalPin } from '@/lib/localPin';

async function syncToServerCookies() {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No active session');
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? null,
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Auth sync failed (${res.status})`);
  }
  return true;
}

export default function TrustStep({ onDone }) {
  const router = useRouter();
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

  const goDashboard = async () => {
    // Ensure cookies are written, then hard-replace and refresh so SSR reads them
    await syncToServerCookies();
    // small tick to ensure Set-Cookie is committed before navigation
    await new Promise(r => setTimeout(r, 50));
    router.replace('/dashboard');
    router.refresh();
    if (onDone) onDone();
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
      setExistingPin(true);
      setToast('🌿 Your voice is now sealed to this device.');
      await goDashboard();
    } catch (error) {
      console.error('PIN save failed:', error);
      setPinErr(error?.message || 'Could not save PIN. Try again.');
    } finally {
      setPinBusy(false);
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
              onClick={async () => {
                setToast('🌿 Your voice is now sealed to this device.');
                await goDashboard();
              }}
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
