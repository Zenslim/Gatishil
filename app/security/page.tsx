
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SecuritySetup() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = '/join';
        return;
      }
      setEmail(data.user.email ?? '(no email)');
      setReady(true);
    })();
  }, []);

  async function setAccountPassword() {
    try {
      setBusy(true);
      setMessage(null);
      if (password.length < 8) throw new Error('Use 8+ characters');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password set ✔ Now add a Passkey for one-tap login.');
    } catch (e: any) {
      setMessage(e.message || 'Could not set password');
    } finally {
      setBusy(false);
    }
  }

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('No session token; please re-login via OTP');
    return { Authorization: `Bearer ${token}` };
  }

  async function registerPasskey() {
    try {
      setBusy(true);
      setMessage(null);

      // 1) get options from server (user-bound via Authorization header)
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: await authHeader(),
      });
      if (!optRes.ok) throw new Error('Failed to fetch registration options');
      const options = await optRes.json();

      // 2) browser ceremony
      const attResp = await startRegistration(options);

      // 3) verify on server
      const verifyRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify(attResp),
      });
      const vr = await verifyRes.json();
      if (!verifyRes.ok || !vr?.verified) throw new Error(vr?.error || 'Passkey verify failed');

      setMessage('Passkey added ✔ You can now sign in with biometrics.');
    } catch (e: any) {
      setMessage(e.message || 'Could not register passkey');
    } finally {
      setBusy(false);
    }
  }

  async function quickTestLogin() {
    try {
      setBusy(true);
      setMessage(null);

      const optsRes = await fetch('/api/webauthn/authn/options', { method: 'POST' });
      if (!optsRes.ok) throw new Error('Failed to fetch authn options');
      const options = await optsRes.json();

      const asResp = await startAuthentication(options);

      const verifyRes = await fetch('/api/webauthn/authn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asResp),
      });
      const vr = await verifyRes.json();
      if (!verifyRes.ok || !vr?.verified) throw new Error(vr?.error || 'Auth verify failed');

      setMessage('Passkey sign-in works ✔');
    } catch (e: any) {
      setMessage(e.message || 'Passkey test failed');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-6">
        <h1 className="text-2xl font-semibold">🔐 Finish Security</h1>
        <p className="text-sm text-white/70">
          Logged in as <span className="font-mono">{email}</span>
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1) Set a Password</h2>
          <input
            type="password"
            className="w-full rounded-lg bg-white/5 px-3 py-2 outline-none"
            placeholder="New password (8+ chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            onClick={setAccountPassword}
            disabled={busy}
            className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2"
          >
            Set Password
          </button>
        </section>

        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold">2) Add a Passkey (Face/Touch)</h2>
          <button
            onClick={registerPasskey}
            disabled={busy}
            className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2"
          >
            Register Passkey
          </button>

          <button
            onClick={quickTestLogin}
            disabled={busy}
            className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2"
          >
            Test Passkey Sign-in
          </button>
        </section>

        {message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            {message}
          </div>
        )}

        <p className="text-xs text-white/50">
          You can always use OTP as backup. Password + Passkey = no OTP next time.
        </p>
      </div>
    </main>
  );
}
