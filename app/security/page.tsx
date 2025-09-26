// app/security/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SecurityPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  // Load current session/email (OTP already did the first proof)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setHasSession(!!sess);
      setEmail(sess?.user?.email ?? '');
    })();
  }, []);

  // ELI15: First time you used OTP to prove the email.
  // Now set a password. Your browser will offer to save it.
  // Later, your device can autofill it unlocked by Face/Touch/PIN.
  const eli15 =
    'Set a password once. Your browser will save it. Next time, Face/Touch/PIN unlocks autofill and you sign in instantly. OTP stays as the backup key.';

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!password || password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }

    try {
      setSaving(true);

      // 1) Update password on the current (OTP) session
      const up = await supabase.auth.updateUser({ password });
      if (up.error) throw up.error;

      // 2) Sign out to force a clean credential save/sign-in
      await supabase.auth.signOut();

      // 3) Immediately sign in with email + password
      //    This specific flow triggers the native "Save password?" prompt
      const si = await supabase.auth.signInWithPassword({ email, password });
      if (si.error) throw si.error;

      setMsg('✅ Password saved. Your browser should offer to save it now.');
      // 4) Smooth redirect to members
      setTimeout(() => router.push('/members'), 900);
    } catch (e: any) {
      setErr(e?.message || 'Failed to save password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">🔐 Finish Security</h1>
        <p className="text-zinc-300 mt-2">{eli15}</p>

        <div className="mt-3 text-sm text-zinc-400">
          {hasSession ? (
            <span>
              Logged in as{' '}
              <span className="text-white font-medium">{email || 'your account'}</span>
            </span>
          ) : (
            <span className="text-amber-300">
              You are not signed in. Visit <code>/join</code> and complete OTP first.
            </span>
          )}
        </div>

        {msg && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3 text-emerald-200">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-red-200">
            {err}
          </div>
        )}

        {/* Password form with attributes that maximize password-manager support */}
        <section className="mt-6">
          <h2 className="text-lg font-medium">
            Set a Password <span className="text-zinc-400">(recommended)</span>
          </h2>

          <form onSubmit={handleSetPassword} className="mt-3 space-y-3">
            {/* Hidden username field helps some managers link the pair */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              defaultValue={email}
              className="hidden"
              readOnly
            />

            <label className="block text-sm text-zinc-300">
              New password (8+ chars)
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
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
              disabled={saving || !hasSession}
              className="w-full rounded-xl bg-emerald-600 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>

          <p className="text-xs text-zinc-400 mt-3">
            Tip: If your browser didn’t offer to save, open the sign-in page next and sign in once
            with email + password — it will prompt to save and then allow Face/Touch/PIN unlock.
          </p>
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
