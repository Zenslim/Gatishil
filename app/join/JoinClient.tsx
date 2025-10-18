'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/app/data/countries';
import { supabase, resetLocalSessionIfInvalid } from '@/lib/supabase/client';

const SMS_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED === 'true';

function toE164(countryDial: string, raw: string) {
  const digits = raw.replace(/\D/g, '');
  const dialDigits = countryDial.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith(dialDigits) ? digits : `${dialDigits}${digits}`;
  return `+${normalized}`;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function JoinClient() {
  const router = useRouter();

  const [tab, setTab] = useState<'phone' | 'email'>(SMS_ENABLED ? 'phone' : 'email');
  const [countryDial, setCountryDial] = useState(() => (COUNTRIES[0] as { dial: string }).dial);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<'phone' | 'email' | null>(null);

  const siteUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, ''),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await resetLocalSessionIfInvalid();
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          router.replace('/onboard?src=join');
          return;
        }
      } catch {}
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_id');
        sessionStorage.removeItem('pending_channel');
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setError(null);
  }, [tab]);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loadingKey || !SMS_ENABLED) return;
    setLoadingKey('phone');
    setError(null);

    try {
      const formatted = toE164(countryDial, phone);
      if (!/^\+\d{10,15}$/.test(formatted)) {
        throw new Error('Enter a valid phone number.');
      }

      const { error: sendError } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (sendError) throw sendError;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_id', formatted);
        sessionStorage.setItem('pending_channel', 'phone');
      }

      router.push('/verify');
    } catch (err: any) {
      setError(err?.message || 'Could not send SMS code. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loadingKey) return;
    setLoadingKey('email');
    setError(null);

    try {
      if (!isEmail(email)) {
        throw new Error('Enter a valid email.');
      }

      const normalized = email.trim().toLowerCase();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: true },
      });
      if (sendError) throw sendError;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_id', normalized);
        sessionStorage.setItem('pending_channel', 'email');
      }

      router.push('/verify');
    } catch (err: any) {
      setError(err?.message || 'Could not send email code. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <header className="px-6 md:px-12 pt-16 pb-10">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-4 text-4xl md:text-5xl font-black leading-tight">
          Join the DAO Party of the Powerless
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          We’ll send a 6-digit code to confirm it’s you.
        </p>
      </header>

      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-xl mx-auto rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-[0_0_40px_-20px_rgba(255,255,255,0.4)]">
          <div className="flex gap-2 rounded-xl bg-white/10 p-1 mb-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setTab('phone')}
              className={`flex-1 px-4 py-2 rounded-lg transition ${tab === 'phone' ? 'bg-white text-black' : 'text-slate-300'} ${SMS_ENABLED ? '' : 'opacity-60'}`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`flex-1 px-4 py-2 rounded-lg transition ${tab === 'email' ? 'bg-white text-black' : 'text-slate-300'}`}
            >
              Email
            </button>
          </div>

          {tab === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Phone number</label>
                <div className="flex gap-2">
                  <select
                    value={countryDial}
                    onChange={(event) => setCountryDial(event.target.value)}
                    className="rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm"
                    aria-label="Country dialing code"
                  >
                    {(COUNTRIES as { dial: string; flag: string; name: string }[]).map((c) => (
                      <option key={c.dial} value={c.dial} className="bg-slate-900 text-white">
                        {c.flag} {c.name} (+{c.dial})
                      </option>
                    ))}
                  </select>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="98••••••••"
                    inputMode="tel"
                    autoComplete="tel"
                    className="flex-1 rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-base outline-none"
                  />
                </div>
                {!SMS_ENABLED && (
                  <p className="mt-2 text-xs text-amber-300/80">
                    SMS is paused. Use email to receive your code.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!SMS_ENABLED || loadingKey === 'phone'}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-400 text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingKey === 'phone' ? 'Sending…' : 'Send code'}
              </button>
            </form>
          )}

          {tab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Email address</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-base outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loadingKey === 'email'}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingKey === 'email' ? 'Sending…' : 'Email me the code'}
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-xs text-rose-300">{error}</p>}

          <p className="mt-6 text-[11px] text-slate-400">
            We never reveal whether an address or number exists—generic errors protect your privacy.
            {siteUrl ? (
              <span className="block mt-1 text-slate-500">Requests originate from {siteUrl}.</span>
            ) : null}
          </p>
        </div>
      </section>
    </main>
  );
}
