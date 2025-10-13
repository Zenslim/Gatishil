'use client';

import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// Create a fresh browser client here so we control session retrieval
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
  const [serverErr, setServerErr] = useState(null);
  const [pin, setPin] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const ok = await window?.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        setSupported(!!ok);
      } catch {
        setSupported(false);
      }
      // lightweight check (optional route; ignore if 404)
      try {
        const r = await fetch('/api/webauthn/options', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: '{}'
        });
        // We expect 401 here if not sending Authorization; that's fine for a ping
        if (!r.ok && r.status !== 401) setServerErr(`API status: ${r.status}`);
      } catch {
        setServerErr('API unreachable');
      }
    })();
  }, []);

  const finish = () => {
    setTimeout(() => {
      if (onDone) onDone();
      else router.replace('/dashboard');
    }, 900);
  };

  // Always produce a fresh access token; if cookie-only auth, refresh to materialize token
  const getAccessToken = async () => {
    const supabase = supabaseBrowser();
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed, error: rerr } = await supabase.auth.refreshSession();
      if (rerr) throw new Error('Unable to refresh session (re-login may be required)');
      session = refreshed.session;
    }
    const token = session?.access_token;
    if (!token) throw new Error('Missing access token (are you signed in on this host?)');
    return token;
  };

  const authHeaders = async () => {
    const token = await getAccessToken();
    return {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const doPasskey = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      // 1) Get server registration options (must authenticate here)
      const r1 = await fetch('/api/webauthn/options', {
        method: 'POST',
        credentials: 'include',             // send cookies as well
        headers: await authHeaders(),       // and send Bearer
        body: '{}',
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        throw new Error(j1?.error || `Options failed (${r1.status})`);
      }

      // Some servers return {ok, options}, others return the options directly
      const options = j1?.options ?? j1;
      if (!options || !options.challenge) {
        throw new Error('Invalid registration options (no challenge)');
      }

      // 2) Create WebAuthn credential in the browser
      const attestation = await startRegistration(options);
      if (!attestation) throw new Error('No credential created');

      // 3) Verify & commit on server
      const r2 = await fetch('/api/webauthn/verify', {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({ credential: attestation }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.ok) {
        throw new Error(j2?.error || `Verify failed (${r2.status})`);
      }

      setMsg('🌿 Your voice is now sealed to this device.');
      finish();
    } catch (e) {
      console.error('Passkey setup failed:', e);
      setErr(e?.message || 'Passkey setup failed');
    } finally {
      setBusy(false);
    }
  };

  const doPin = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (!/^[0-9]{4}$/.test(pin)) throw new Error('Enter a 4-digit PIN');
      // Your local PIN creation (unchanged) – placeholder call:
      // await createLocalPin(pin);
      setMsg('🌿 Your voice is now sealed to this device.');
      finish();
    } catch (e) {
      console.error('PIN creation failed:', e);
      setErr(e?.message || 'Could not create PIN');
    } finally {
      setBusy(false);
    }
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
            {/* Optional PIN fallback UI; wire to your local PIN helpers */}
            <label className="block">
              <span className="text-sm text-gray-300">Create a 4-digit PIN 🔑</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white
                           placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••"
              />
            </label>
            <button onClick={doPin} disabled={busy}
              className="mt-3 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60">
              {busy ? 'Saving…' : 'Create PIN'}
            </button>
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
