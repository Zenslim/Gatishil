// app/security/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SecurityPage() {
  const router = useRouter();

  // UI state
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<{pass:boolean; reg:boolean; test:boolean}>({pass:false, reg:false, test:false});
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [hasSession, setHasSession] = useState<boolean>(false);

  // On mount, show who’s logged in (ELI15: you must already be logged in by OTP once)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setHasSession(!!sess);
      setEmail(sess?.user?.email ?? '');
    })();
  }, []);

  // ELI15 copy (kept short on screen)
  const eli15 =
    'First login uses OTP. Now add either a password or a passkey (Face/Touch). After that, future logins can skip OTP. OTP still works as backup.';

  // 1) Set/Update password using Supabase Auth
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage('');
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      setLoading(s => ({...s, pass:true}));
      const { data, error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      if (data?.user) {
        setMessage('✅ Password saved. You can now sign in with email + password (no OTP needed).');
        // optional: route to members
        setTimeout(() => router.push('/members'), 800);
      } else {
        setError('Unexpected response while saving password.');
      }
    } catch (e:any) {
      setError(readableError(e));
    } finally {
      setLoading(s => ({...s, pass:false}));
    }
  }

  // 2a) Register a Passkey (WebAuthn) via Supabase GoTrue built-ins
  // Requires: you are logged in (OTP already done), and your production origin is allowed in Supabase Auth → Settings.
  async function handleRegisterPasskey() {
    setError(''); setMessage('');
    try {
      setLoading(s => ({...s, reg:true}));
      // Supabase JS v2 has createPasskey (WebAuthn) on user session
      // Device nickname is optional; helps list passkeys later
      // @ts-ignore - allow if types lag behind runtime
      const { error: err } = await (supabase.auth as any).createPasskey({ name: deviceNickname() });
      if (err) throw err;
      setMessage('✅ Passkey registered on this device. Next time, choose "Sign in with Passkey".');
      // optional: route to members
      setTimeout(() => router.push('/members'), 800);
    } catch (e:any) {
      const msg = readableError(e);
      setError(msg);
    } finally {
      setLoading(s => ({...s, reg:false}));
    }
  }

  // 2b) Quick Passkey sign-in test (works best after you sign out, but we keep it here for sanity)
  async function handleTestPasskey() {
    setError(''); setMessage('');
    try {
      setLoading(s => ({...s, test:true}));
      // If you’re already logged in, this will usually no-op. It’s just a device test.
      // @ts-ignore - allow if types lag behind runtime
      const { data, error: err } = await (supabase.auth as any).signInWithPasskey();
      if (err) throw err;
      if (data?.session) {
        setMessage('🔐 Passkey test succeeded. Session active.');
        setTimeout(() => router.push('/members'), 800);
      } else {
        setMessage('Passkey prompt was cancelled or no credential available on this browser.');
      }
    } catch (e:any) {
      setError(readableError(e));
    } finally {
      setLoading(s => ({...s, test:false}));
    }
  }

  // Helpers
  function deviceNickname() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'device';
    const short = ua.split(')')[0]?.slice(0, 24) || 'device';
    return `Passkey · ${short}`;
  }

  function readableError(e:any): string {
    const raw = e?.message || String(e);
    // Friendly hint for the exact issue you saw:
    // “Failed to fetch registration options” happens when the domain/origin isn’t allowed in Supabase Auth WebAuthn settings.
    if (raw.toLowerCase().includes('registration options') || raw.toLowerCase().includes('webauthn')) {
      return 'Failed to fetch registration options. This usually means your site origin is not allowed in Supabase Auth → Settings. Ensure your deployed URL (e.g., https://gatishil.vercel.app) is set as Site URL and allowed for Passkeys.';
    }
    return raw;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">🔐 Finish Security</h1>
        <p className="text-zinc-300 mt-2">{eli15}</p>

        <div className="mt-4 text-sm text-zinc-400">
          {hasSession ? (
            <span>Logged in as <span className="text-white font-medium">{email || 'your account'}</span></span>
          ) : (
            <span className="text-amber-300">You are not signed in. Visit /join or complete OTP first.</span>
          )}
        </div>

        {/* Messages */}
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

        {/* Divider */}
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

          <p className="mt-3 text-sm text-zinc-400">
            OTP stays as backup. Once you add a password or a passkey, you won’t need OTP every time. Why not both? ✔
          </p>
        </section>

        {/* Back to members */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/members')}
            className="w-full rounded-xl bg-zinc-800 py-3 font-medium hover:bg-zinc-700 border border-white/10"
          >
            ← Go to Members
          </button>
        </div>

        {/* Tiny footnote to catch the specific production config bug without extra steps */}
        <p className="mt-4 text-xs text-zinc-500">
          If you see “Failed to fetch registration options”, add your live URL as Site URL and allowed WebAuthn origin in Supabase Auth settings.
        </p>
      </div>
    </div>
  );
}
