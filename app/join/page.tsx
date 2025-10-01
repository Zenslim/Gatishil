// app/join/page.tsx — Join → Auth-only per PRD (redirect to /onboarding)
// Next.js App Router + Supabase + Vercel
'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { COUNTRIES } from '@/app/data/countries';

type Country = { flag: string; dial: string; name: string };
type Channel = 'phone' | 'email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://www.gatishilnepal.org');
const CALLBACK = `${SITE_URL}/join`;

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());
const isE164 = (s: string) => /^\+\d{8,15}$/.test((s || '').trim());

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh grid place-items-center bg-black text-slate-300">
          <div className="text-sm opacity-80">Loading…</div>
        </main>
      }
    >
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const router = useRouter();

  // -------------- State --------------
  const [channel, setChannel] = useState<Channel>('phone');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => {
    setMsg(null);
    setErr(null);
  };

  // Country (Nepal default, country picker hidden)
  const getDefaultCountry = () =>
    (COUNTRIES as Country[]).find((c) => c.name === 'Nepal' || c.dial === '977') ||
    (COUNTRIES as Country[])[0];
  const [country, setCountry] = useState<Country>(getDefaultCountry());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  // Phone local number + E.164
  const [localNumber, setLocalNumber] = useState('');
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // OTP (6 cells)
  const [otpCells, setOtpCells] = useState<string[]>(['', '', '', '', '', '']);
  const cellRefs = useRef<Array<HTMLInputElement | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const otp = useMemo(() => otpCells.join(''), [otpCells]);

  // Resend cooldown (seconds)
  const [cooldown, setCooldown] = useState<number>(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Email
  const [email, setEmail] = useState('');

  // -------------- Session guards --------------
  // If session present at any time on /join → redirect to /onboarding
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace('/onboarding');
    })();
  }, [router]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) router.replace('/onboarding');
    });
    return () => {
      sub.subscription?.unsubscribe?.();
    };
  }, [router]);

  // Magic-link return handler: wait for session, strip hash, redirect
  useEffect(() => {
    let alive = true;
    async function waitForSession(maxTries = 60, delayMs = 200) {
      for (let i = 0; i < maxTries; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!alive) return null;
        if (session) return session;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return null;
    }
    (async () => {
      if (typeof window === 'undefined') return;
      const { origin, pathname, hash } = window.location;
      const hasAccessToken = hash && hash.includes('access_token=');
      if (!hasAccessToken) return;

      // If on wrong host → bounce to canonical
      if (!origin.startsWith(SITE_URL)) {
        window.location.replace(CALLBACK);
        return;
      }

      // Wait for Supabase to hydrate, then clean hash and redirect
      await waitForSession();
      const clean = new URL(`${origin}${pathname}`);
      window.history.replaceState({}, '', clean.toString());
      router.replace('/onboarding');
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // -------------- Actions --------------
  async function sendPhoneOtp() {
    resetAlerts();
    if (!isE164(e164)) {
      setErr('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || httpErr(res, data));
        return;
      }
      setMsg(`We sent a code to +${country.dial} ${maskLocalForHint(localNumber)}`);
      setCooldown(30);
      // focus first cell
      setTimeout(() => cellRefs.current[0]?.focus(), 0);
      console.log('analytics: otp.send');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    resetAlerts();
    if (!/^\d{6}$/.test(otp)) {
      setErr('Enter the 6-digit code.');
      cellRefs.current[0]?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, code: otp }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || 'Invalid or expired code');
        return;
      }
      // Session will hydrate; onAuthStateChange will redirect.
      setMsg('Securing session…');
      console.log('analytics: otp.verify.ok');
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
      console.log('analytics: otp.verify.fail');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    await sendPhoneOtp();
  }

  async function sendEmailMagicLink() {
    resetAlerts();
    if (!isEmail(email)) {
      setErr('Enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: CALLBACK },
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setMsg("Check your email and tap the magic link. You'll return here.");
      console.log('analytics: ml.send');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending magic link');
    } finally {
      setLoading(false);
    }
  }

  // -------------- OTP Cells handlers --------------
  const onCellChange = useCallback((idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(0, 1);
    setOtpCells((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) cellRefs.current[idx + 1]?.focus();
  }, []);

  const onCellKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otpCells[idx] && idx > 0) {
        cellRefs.current[idx - 1]?.focus();
      }
    },
    [otpCells]
  );

  const onOtpPaste = useCallback((e: React.ClipboardEvent) => {
    const text = (e.clipboardData.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (text.length === 0) return;
    e.preventDefault();
    const filled = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtpCells(filled as string[]);
    if (filled.every((c: string) => c)) cellRefs.current[5]?.blur();
  }, []);

  // -------------- UI --------------
  return (
    <main className="min-h-dvh bg-black text-white">
      {/* Header */}
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHIL NEPAL
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-rose-300">
            DAO Party
          </span>
          <br className="hidden md:block" /> of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Two simple ways: <b>Phone OTP</b> or <b>Email Magic Link</b>. After
          verification, you&apos;ll be taken straight to onboarding.
        </p>
      </header>

      {/* Card */}
      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          {/* Tabs */}
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => {
                setChannel('phone');
                resetAlerts();
              }}
              className={
                'px-3 py-2 rounded-full border transition ' +
                (channel === 'phone'
                  ? 'bg-white text-black'
                  : 'border-white/15 hover:bg-white/5')
              }
            >
              📱 Phone
            </button>
            <button
              onClick={() => {
                setChannel('email');
                resetAlerts();
              }}
              className={
                'px-3 py-2 rounded-full border transition ' +
                (channel === 'email'
                  ? 'bg-white text-black'
                  : 'border-white/15 hover:bg-white/5')
              }
            >
              ✉️ Email
            </button>
          </div>

          {/* PHONE FLOW — Nepal default, simple UI */}
          {channel === 'phone' && (
            <div className="mt-4 space-y-4">
              {/* Country — hidden by default (Nepal preselected) */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-300/70">
                    Nepal (+977) is set by default. Change if needed.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker((v) => !v)}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    {showCountryPicker ? 'Hide country' : 'Change country'}
                  </button>
                </div>

                {showCountryPicker && (
                  <div className="mt-2">
                    <input
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      placeholder="Search country"
                      className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400 mb-2"
                      aria-label="Search country"
                    />
                    <select
                      value={country.dial}
                      onChange={(e) => {
                        const next =
                          (COUNTRIES as Country[]).find(
                            (c) => c.dial === e.target.value
                          ) || getDefaultCountry();
                        setCountry(next);
                      }}
                      className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2"
                      aria-label="Select country code"
                    >
                      {(COUNTRIES as Country[])
                        .filter((c) =>
                          (c.name + c.dial + c.flag)
                            .toLowerCase()
                            .includes(countryQuery.toLowerCase())
                        )
                        .map((c, i) => (
                          <option
                            key={`${c.dial}-${i}`}
                            value={c.dial}
                            className="bg-slate-900"
                          >
                            {c.flag} {c.name} (+{c.dial})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">
                  Phone
                </label>
                <div className="flex gap-2">
                  <div className="min-w-[110px] rounded-xl border border-white/15 px-3 py-2 text-slate-300/90">
                    +{country.dial}
                  </div>
                  <input
                    value={localNumber}
                    onChange={(e) => setLocalNumber(e.target.value)}
                    placeholder={country.dial === '977' ? '98XXXXXXXX' : 'Your number'}
                    inputMode="numeric"
                    className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                    aria-label="Local phone number"
                  />
                </div>
              </div>

              {/* Send OTP button */}
              <button
                onClick={sendPhoneOtp}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>

              {/* Helper / Errors */}
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-slate-400">
                  We’ll text a 6-digit code. Message & data rates may apply.
                </p>
                {msg && <p className="text-xs text-emerald-300">{msg}</p>}
                {err && <p className="text-xs text-rose-300">{err}</p>}
              </div>

              {/* Code inputs */}
              <div className="mt-3">
                <label className="block text-xs text-slate-300/70 mb-1">
                  Enter 6-digit code
                </label>
                <div className="flex gap-2" onPaste={onOtpPaste}>
                  {otpCells.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        cellRefs.current[i] = el;
                      }}
                      value={v}
                      onChange={(e) => onCellChange(i, e.target.value)}
                      onKeyDown={(e) => onCellKeyDown(i, e)}
                      inputMode="numeric"
                      maxLength={1}
                      className="w-10 h-12 text-center rounded-xl bg-transparent border border-white/15 placeholder:text-slate-400"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={verifyPhoneOtp}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
                  >
                    {loading ? 'Verifying…' : 'Verify'}
                  </button>
                  <button
                    onClick={resendOtp}
                    disabled={cooldown > 0}
                    className="px-3 py-3 rounded-2xl border border-white/15 disabled:opacity-60"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMAIL FLOW */}
          {channel === 'email' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                  aria-label="Email address"
                />
              </div>
              <button
                onClick={sendEmailMagicLink}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
              {msg && <p className="text-xs text-emerald-300">{msg}</p>}
              {err && <p className="text-xs text-rose-300">{err}</p>}
              <p className="text-[11px] text-slate-400">
                After you tap the link, you&apos;ll return here and we&apos;ll open
                onboarding automatically.
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-center text-[11px] text-slate-500">
          By continuing, you agree to our Terms and Privacy.
        </p>
      </section>
    </main>
  );
}

/* ---------------- Utilities ---------------- */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
  const txt = await res.text().catch(() => '');
  try {
    return JSON.parse(txt);
  } catch {
    return { raw: txt };
  }
}
function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}
function maskLocalForHint(local: string) {
  const digits = (local || '').replace(/\D/g, '');
  if (digits.length < 2) return '••••••••';
  return `${digits.slice(0, 2)}••••••••`;
}
