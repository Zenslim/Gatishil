'use client';

import React, { useEffect, useState } from 'react';
import { startRegistration, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { createLocalPin, hasLocalPin } from '@/lib/localPin';

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function TrustStep({ onDone }) {
  const [supported, setSupported] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [toast, setToast] = useState(null);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinErr, setPinErr] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [existingPin, setExistingPin] = useState(false);
  const [passkeyReady, setPasskeyReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      if (!window.PublicKeyCredential) {
        setSupported(false);
        setPasskeyReady('skip');
        return;
      }

      try {
        const ok = await platformAuthenticatorIsAvailable();
        if (ok) {
          setSupported(true);
          setPasskeyReady(false);
        } else {
          setSupported(false);
          setPasskeyReady('skip');
        }
      } catch {
        setSupported(false);
        setPasskeyReady('skip');
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setExistingPin(hasLocalPin());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const goDashboard = () => {
    setTimeout(() => {
      router.push('/dashboard');
      if (onDone) onDone();
    }, 650);
  };

  const getFreshSession = async () => {
    const supabase = supabaseBrowser();
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw new Error('Please sign in again');
      session = data.session;
    }
    if (!session?.access_token) throw new Error('Missing access token');
    return { access_token: session.access_token, refresh_token: session.refresh_token ?? null };
  };

  const syncToServerCookies = async () => {
    const { access_token, refresh_token } = await getFreshSession();
    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_token, refresh_token }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Auth sync failed (${res.status})`);
    }
    return access_token;
  };

  const doPasskey = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const token = await syncToServerCookies();

      const r1 = await fetch('/api/webauthn/options', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(j1?.error || `Options failed (${r1.status})`);
      const options = j1?.options ?? j1;
      if (!options?.challenge) throw new Error('Invalid registration options');

      const attestation = await startRegistration(options);
      if (!attestation) throw new Error('No credential created');

      const r2 = await fetch('/api/webauthn/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ credential: attestation }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.ok) throw new Error(j2?.error || `Verify failed (${r2.status})`);

      setMsg('Passkey saved for this device. Add a PIN to finish.');
      setPasskeyReady(true);
    } catch (e) {
      console.error('Passkey setup failed:', e);
      setErr(e?.message || 'Passkey setup failed');
    } finally {
      setBusy(false);
    }
  };

  const pinLengthOk = pin.length >= 4 && pin.length <= 8;
  const showPinForm = passkeyReady === true || passkeyReady === 'skip';

  const savePin = async (e) => {
    e.preventDefault();
    if (pinBusy) return;
    setPinErr(null);

    if (!pinLengthOk) {
      setPinErr('Use a 4-8 digit PIN.');
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
      setToast('Your voice is now sealed to this device.');
      goDashboard();
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
          You’ve shared your name, roots, and skills. Now, let’s seal your voice to this device so it recognizes you every time
 you return.
        </p>

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
            <p className="text-sm text-amber-300">
              This device doesn’t support platform passkeys. Use OTP or Magic Link for now.
            </p>
          </div>
        )}

        {msg && <p className="mt-4 text-emerald-400">{msg}</p>}
        {err && <p className="mt-4 text-red-400">{err}</p>}

        {showPinForm && (
          <>
            <form className="mt-8 space-y-4" onSubmit={savePin}>
              <div>
                <label className="block text-sm font-medium text-gray-300">Create a PIN (4-8 digits)</label>
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
              <p className="text-xs text-white/50">
                We use this PIN whenever biometrics aren’t available. It stays encrypted on this device.
              </p>
            </form>

            {existingPin && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => { setToast('Your voice is now sealed to this device.'); goDashboard(); }}
                  className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/10"
                >
                  Keep existing PIN → Continue
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
