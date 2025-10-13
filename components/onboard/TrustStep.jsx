'use client';

import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { supabase } from '@/lib/supabaseClient';
import { createLocalPin, hasLocalPin } from '@/lib/localPin';
import { useRouter } from 'next/navigation';

export default function TrustStep({ onDone }) {
  const [supported, setSupported] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [serverErr, setServerErr] = useState(null);
  const [pin, setPin] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const ok = await window?.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        setSupported(!!ok);
      } catch { setSupported(false); }
      try {
        const r = await fetch('/api/webauthn/ping');
        setServerErr(r.ok ? null : 'Ping failed');
      } catch {
        setServerErr('API unreachable');
      }
    })();
  }, []);

  const finish = () => {
    setTimeout(() => {
      if (onDone) onDone();
      else router.replace('/dashboard');
    }, 1200);
  };

  const doPasskey = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign-in required');
      const user = session.user;

      const r1 = await fetch('/api/webauthn/options', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: user.email || user.id }),
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(j1?.error || 'Failed to get registration options');

      const att = await startRegistration(j1);

      const r2 = await fetch('/api/webauthn/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, response: att }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.ok) throw new Error(j2?.error || 'Verification failed');

      setMsg('🌿 Your voice is now sealed to this device.');
      finish();
    } catch (e) {
      console.error('Passkey setup failed:', e);
      setErr(e?.message || 'Passkey setup failed');
    } finally { setBusy(false); }
  };

  const doPin = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (!/^[0-9]{4}$/.test(pin)) throw new Error('Enter a 4-digit PIN');
      await createLocalPin(pin);
      setMsg('🌿 Your voice is now sealed to this device.');
      finish();
    } catch (e) {
      console.error('PIN creation failed:', e);
      setErr(e?.message || 'Could not create PIN');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[80vh] bg-neutral-950 text-white grid place-items-center p-6">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-black/40 border border-white/10">
        <div className="text-4xl mb-2">🌳</div>
        <h2 className="text-2xl font-semibold">Welcome under the tree</h2>
        <p className="text-white/70 mt-2">
          You’ve shared your name, roots, and skills. Now, let’s seal your voice to this device so it recognizes you every time you return.
        </p>

        {serverErr && <p className="mt-2 text-amber-300 text-sm">API: {serverErr}</p>}

        {supported === null ? (
          <p className="mt-6 text-sm text-white/60">Checking your device capabilities…</p>
        ) : supported ? (
          <div className="mt-6">
            <button onClick={doPasskey} disabled={busy}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60">
              {busy ? 'Creating…' : 'Create Passkey 🔐'}
            </button>
            <p className="mt-3 text-xs text-white/60">
              Your secret stays on your device. Passkeys make your Chautarī visits effortless.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {hasLocalPin() ? (
              <p className="text-sm text-emerald-300">A device PIN already exists.</p>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-300">Create a 4-digit PIN 🔑</span>
                  <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white
                               placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••" />
                </label>
                <button onClick={doPin} disabled={busy}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60">
                  {busy ? 'Saving…' : 'Create PIN'}
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-white/60">
              The PIN never leaves your device. We encrypt a secret locally to recognize you later.
            </p>
          </div>
        )}

        {msg && <p className="mt-4 text-emerald-400">{msg}</p>}
        {err && <p className="mt-4 text-red-400">{err}</p>}

        <div className="mt-6">
          <button onClick={() => (onDone ? onDone() : router.replace('/dashboard'))}
            className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/10">
            Not now → Use OTP next time
          </button>
        </div>
      </div>
    </div>
  );
}
