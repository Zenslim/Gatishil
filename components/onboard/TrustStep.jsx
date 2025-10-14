'use client';

import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const ok = await window?.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        setSupported(!!ok);
      } catch {
        setSupported(false);
      }
    })();
  }, []);

  const finish = () => {
    setTimeout(() => {
      if (onDone) onDone();
      else router.replace('/dashboard');
    }, 900);
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

      setMsg('🌿 Your voice is now sealed to this device.');
      finish();
    } catch (e) {
      console.error('Passkey setup failed:', e);
      setErr(e?.message || 'Passkey setup failed');
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
              This device doesn’t support platform passkeys. Use OTP for now.
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
