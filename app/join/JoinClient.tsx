'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase, resetLocalSessionIfInvalid } from '@/lib/supabase/client';
import { isEmail } from '@/lib/auth/validate';

const NEPAL_PHONE_REGEX = /^\+977\d{8,11}$/;

export default function JoinClient() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await resetLocalSessionIfInvalid();
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session && typeof window !== 'undefined') {
          window.location.replace('/onboard?src=join');
          return;
        }
      } catch {}
      if (!cancelled && typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_id');
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedPhone = useMemo(() => phone.trim(), [phone]);
  const emailValid = isEmail(normalizedEmail);
  const phoneValid = NEPAL_PHONE_REGEX.test(normalizedPhone);
  const bothFilled = normalizedEmail.length > 0 && normalizedPhone.length > 0;

  useEffect(() => {
    if (!loading) {
      setError(null);
    }
  }, [normalizedEmail, normalizedPhone, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      if (emailValid) {
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: true },
        });
        if (sendError) throw sendError;

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pending_id', normalizedEmail);
          window.location.href = '/verify';
        }
        return;
      }

      if (!phoneValid) {
        if (normalizedPhone && !normalizedPhone.startsWith('+977')) {
          setError('Phone OTP is Nepal-only. Enter +977… or use email.');
        } else {
          setError('Phone OTP is Nepal-only. Enter +977… or use email.');
        }
        return;
      }

      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          setError('SMS is unavailable. Use email to receive your code.');
        } else if (response.status === 400) {
          setError('Phone OTP is Nepal-only. Enter +977… or use email.');
        } else {
          const payload = await response.json().catch(() => ({}));
          setError(payload?.error || 'Could not send the code. Try again in a moment.');
        }
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_id', normalizedPhone);
        window.location.href = '/verify';
      }
    } catch (err: any) {
      setError(err?.message || 'Could not send the code. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
        <header className="mb-10 space-y-3">
          <h1 className="text-3xl font-semibold md:text-4xl">Join Gatishil Nepal</h1>
          <p className="text-base text-slate-300">
            We’ll send a 6-digit code to confirm it’s you.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Phone</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400"
              />
              <span className="text-xs text-slate-400">Phone OTP works for Nepal (+977) only.</span>
            </label>
          </div>

          {bothFilled && emailValid ? (
            <p className="text-sm text-amber-300">Using email; clear it to use phone.</p>
          ) : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || (!emailValid && !phoneValid)}
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </div>
    </main>
  );
}
