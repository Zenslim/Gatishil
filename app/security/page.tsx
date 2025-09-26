// app/security/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SecurityPage() {
  const router = useRouter();

  // UI state
  const [email, setEmail] = useState<string>('');
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<{ pass:boolean; reg:boolean; test:boolean }>({ pass:false, reg:false, test:false });
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Detect if this supabase-js build exposes WebAuthn helpers
  const webauthnApi = useMemo(() => (supabase.auth as any)?.webauthn ?? null, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setHasSession(!!sess);
      setEmail(sess?.user?.email ?? '');
    })();
  }, []);

  const eli15 =
    'First time you used OTP. Now add a password and/or a passkey (Face/Touch). Next time, log in with either one—OTP stays as a backup only.';

  // 1) Set/Update password (works immediately after OTP session)
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      setLoading(s => ({ ...s, pass: true }));
      const { data, error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      if (data?.user) {
        setMessage('✅ Password saved. You can now sign in with email + password (no OTP needed).');
        setTimeout(() => router.push('/members'), 800);
      } else {
        setError('Unexpected response while saving password.');
      }
    } catch (e:any) {
      setError(readableError(e));
    } finally {
      setLoading(s => ({ ...s, pass: false }));
    }
  }

  // 2a) Register Passkey (feature-detected)
  async function handleRegisterPasskey() {
    setError('');
    setMessage('');
    try {
      if (!webauthnApi?.register) {
        // Old SDK or not exposed — show precise fix
        throw new Error(needsUpgradeHint());
      }
      setLoading(s => ({ ...s, reg: true }));
      // Give this credential a short nickname for your device list
      const nickname = deviceNickname();
      // Newer supabase-js exposes webauthn.register({ name?: string })
      const { error: err } = await webauthnApi.register({ name: nickname });
      if (err) throw err;
      setMessage('✅ Passkey registered on this device. Next time choose “Sign in with Passkey”.');
      setTimeout(() => router.push('/members'), 800);
    } catch (e:any) {
      setError(readableError(e));
    } finally {
      setLoading(s => ({ ...s, reg: false }));
    }
  }

  // 2b) Test Passkey sign-in (mostly a sanity check)
  async function handleTestPasskey() {
    setError('');
    setMessage('');
    try {
      if (!webauthnApi?.authenticate) {
        throw new Error(needsUpgradeHint());
      }
      setLoading(s => ({ ...s, test: true }));
      const { data, error: err } = await webauthnApi.authenticate();
      if (err) throw err;
      if (data?.session) {
        setMessage('🔐 Passkey test succeeded. Session active.');
        setTimeout(() => router.push('/members'), 800);
      } else {
        setMessage('Passkey prompt was cancelled or no credential was found for this origin.');
      }
    } catch (e:any) {
      setError(readableError(e));
    } finally {
      setLoading(s => ({ ...s, test: false }));
    }
  }

  // Helpers
  function deviceNickname() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'device';
    const short = ua.slice(0, 24);
    return `Passkey · ${short}`;
  }

  function needsUpgradeHint() {
    return [
      'Passkey helpers not available in this build.',
      'Fix:',
      '1) In GitHub, set @supabase/supabase-js to a recent 2.x (e.g., "^2.45.x") and commit.',
      '2) In Supabase → Authentication → URL Configuration, set your live Site URL (e.g., https://gatishil.vercel.app).',
      '3) In Authentication → Settings → (Passkeys/WebAuthn), ensure your production origin is allowed.',
    ].join(' ');
  }

  function readableError(e:any): string {
    const raw = e?.message || String(e);
    const low = raw.toLowerCase();

    // Specific messages we’ve seen:
    if (low.includes('createpasskey is not a function')) {
      return needsUpgradeHint();
    }
    if (low.includes('registration options') || low.includes('webauthn')) {
      return 'Failed to fetch registration options. Ensure your live URL is in Supabase Auth → URL Configuration and WebAuthn allowed origins (use your deployed domain, not localhost).';
    }
    if (low.includes('not allowed')) {
      return 'Action was cancelled or this origin is not allowed for WebAuthn. Check Supabase Auth origins.';
    }
    return raw;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">🔐 Finish Security</h1>
        <p className="text-zinc-300 mt-2">{eli15}</p>

        <div className="mt-3 text-sm text-zinc-400">
          {hasSession ? (
            <span>Logged in as <span className="text-white font-medium">{email || 'your account'}</span></span>
          ) : (
            <span className="text-amber-300">You are not signed in. Visit /join and complete OTP first.</span>
          )}
        </div>

        {message && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3 text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-red-200">
            {error}
          </div>
        )}

        {/* 1) Password */}
        <section className="mt-6">
          <h2 className="text-lg font-medium">1) Set a Password <span className="text-zinc-400">(recommended)</span></h2>
          <form onSubmit={handleSetPassword} className="mt-3 space-y-3">
            <label className="block text-sm text-zinc-300">
              New password (8+ chars)
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading.pass}
              className="w-full rounded-xl bg-emerald-600 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading.pass ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>
        </section>

        <div className="my-6 h-px bg-white/10" />

        {/* 2) Passkey */}
        <section>
          <h2 className="text-lg font-medium">2) Or Add a Passkey <span className="text-zinc-400">(Face/Touch)</span></h2>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleRegisterPasskey}
              disabled={loading.reg}
              className="rounded-xl bg-indigo-600 py-3 font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading.reg ? 'Registering…' : 'Register Passkey & Continue'}
            </button>
            <button
              onClick={handleTestPasskey}
              disabled={loading.test}
              className="rounded-xl bg-zinc-800 py-3 font-medium hover:bg-zinc-700 disabled:opacity-50 border border-white/10"
            >
              {loading.test ? 'Testing…' : 'Test Passkey Sign-in'}
            </button>
          </div>

          <ul className="mt-3 text-xs text-zinc-400 list-disc pl-5 space-y-1">
            <li>If buttons show “Passkey helpers not available…”, bump <code>@supabase/supabase-js</code> to a recent 2.x in <code>package.json</code> and redeploy.</li>
            <li>Supabase → Authentication → URL Configuration: set your live Site URL (e.g., <code>https://gatishil.vercel.app</code>).</li>
            <li>Authentication → Settings → Passkeys/WebAuthn: allow your production origin.</li>
          </ul>
        </section>

        <div className="mt-8">
          <button
            onClick={() => router.push('/members')}
            className="w-full rounded-xl bg-zinc-800 py-3 font-medium hover:bg-zinc-700 border border-white/10"
          >
            ← Go to Members
          </button>
        </div>
      </div>
    </div>
  );
}
