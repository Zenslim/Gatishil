'use client';

import { useEffect, useState } from 'react';
import { isEmail, isPhone } from '@/lib/auth/validate';
import { supabase, resetLocalSessionIfInvalid } from '@/lib/supabase/client';

const SMS_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED === 'true';

export default function JoinClient() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Clear any stale/invalid local session (prevents refresh token noise on /join)
  useEffect(() => {
    resetLocalSessionIfInvalid();
  }, []);

  async function send() {
    setErr(null);
    setMsg(null);
    const id = identifier.trim();

    if (!isEmail(id) && !isPhone(id)) {
      setErr('Enter a valid email or phone (+countrycode…).');
      return;
    }

    setBusy(true);
    try {
      if (isPhone(id) && !SMS_ENABLED) {
        setMsg('SMS is temporarily paused. Please enter your email to receive the 6-digit code.');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp(
        isEmail(id)
          ? { email: id, options: { shouldCreateUser: true } }
          : { phone: id }
      );
      if (error) throw error;

      sessionStorage.setItem('pending_id', id);
      window.location.href = '/verify';
    } catch (e: any) {
      // If a refresh-token corner case appears, clear local state and let user retry.
      if (String(e?.message || '').includes('Refresh Token')) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {}
      }
      setErr(e?.message ?? 'Could not send code. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Join Gatishil Nepal</h1>
      <p className="text-sm text-gray-400 mb-6">
        We’ll send a <b>6-digit code</b> to confirm it’s you.
      </p>

      {/* Visible on dark backgrounds: explicit bg/text/placeholder + focus ring */}
      <input
        aria-label="Email or phone"
        type="text"
        inputMode="email"
        autoComplete="email"
        className="
          w-full rounded px-3 py-2 mb-3 border
          bg-white text-black placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40
          dark:bg-neutral-900 dark:text-white dark:placeholder-gray-400 dark:border-neutral-700
          "
        placeholder="Email or +977…"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      <button
        className="w-full rounded px-3 py-2 bg-black text-white disabled:opacity-50 dark:bg-white dark:text-black"
        disabled={busy}
        onClick={send}
      >
        {busy ? 'Sending…' : 'Send 6-digit code'}
      </button>

      {msg && <p className="text-sm text-emerald-500 mt-3">{msg}</p>}
      {err && <p className="text-sm text-rose-500 mt-3">{err}</p>}

      {!SMS_ENABLED && (
        <p className="text-xs text-gray-500 mt-6">
          SMS is paused. Use <b>email</b> to receive your code.
        </p>
      )}
    </main>
  );
}
