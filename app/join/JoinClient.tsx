// app/join/JoinClient.tsx — Unified OTP: Phone OTP or Email OTP (no magic links)
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { COUNTRIES } from '@/app/data/countries';

type Country = { flag: string; dial: string; name: string };

// ---------- Small utilities ----------
function e164(countryDial: string, raw: string) {
  const digits = raw.replace(/\D/g, '');
  const d = countryDial.replace(/\D/g, '');
  if (digits.startsWith(d)) return `+${digits}`;
  return `+${d}${digits}`;
}

async function waitForSession(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    const s = data?.session ?? null;
    if (s) return s;
    // tiny delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return {}; }
  }
  const txt = await res.text().catch(() => '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

function mkIdKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
async function safeFetch(url: string, init: RequestInit, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ---------- Client component ----------
function JoinClientBody() {
  const router = useRouter();
  const _params = useSearchParams(); // kept for potential future use

  // Tabs
  const [tab, setTab] = useState<'phone' | 'email'>('phone');

  // Phone
  const [country, setCountry] = useState<Country>(() => (COUNTRIES as Country[])[0]);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Email
  const [email, setEmail] = useState('');
  const [emailOtpSentTo, setEmailOtpSentTo] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const emailCodeRef = useRef<HTMLInputElement>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Canonical host for wrong-host bounce (if needed later)
  const SITE_URL = useMemo(
    () => (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, ''),
    []
  );

  // Boot: already authenticated?
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess) {
        router.replace('/onboard?src=join');
      }
    })();
  }, [router]);

  // ---------- Actions: Phone OTP (uses your existing API routes) ----------
  async function sendOtp() {
    if (loading) return; // prevent double-tap
    setErr(null); setMsg(null); setLoading(true);

    try {
      const phone = e164(country.dial, phoneRaw);
      if (!phone.startsWith('+977')) {
        setErr('Phone OTP is Nepal-only. use email.');
        setLoading(false);
        return;
      }
      const res = await safeFetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'x-idempotency-key': mkIdKey('otp-send'),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ phone }),
      });

      const data = await safeJson(res);
      if (res.ok && data?.ok === true) {
        setOtpSentTo(phone);
        setMsg('We sent a 6-digit code (expires in 5 minutes).');
        setTimeout(() => otpInputRef.current?.focus(), 50);
        return;
      }

      const errMsg = httpErr(res, data);
      setErr(errMsg);
      // eslint-disable-next-line no-console
      console.error('sendOtp error:', { status: res.status, message: errMsg });
      return;
    } catch (e: any) {
      setErr(e?.message || 'Could not send OTP. Please try again.');
      // eslint-disable-next-line no-console
      console.error('sendOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otpSentTo || loading) return;
    setErr(null); setMsg(null); setLoading(true);

    try {
      const res = await safeFetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'x-idempotency-key': mkIdKey('otp-verify'),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ phone: otpSentTo, code: otp.trim() }),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));

      if (data?.session?.access_token) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token ?? undefined,
        });
        if (setError) throw setError;

        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token ?? undefined,
          }),
        }).catch(() => {});
      }

      const session = await waitForSession();
      if (!session) throw new Error('Session not ready. Please try again.');

      router.replace('/onboard?src=otp');
    } catch (e: any) {
      setErr(e?.message || 'Invalid or expired code.');
      // eslint-disable-next-line no-console
      console.error('verifyOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Actions: Email OTP (pure Supabase, no magic link) ----------
  async function sendEmailOtp() {
    if (loading) return;
    setErr(null); setMsg(null); setLoading(true);
    try {
      if (!isEmail(email)) throw new Error('Enter a valid email.');
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true }, // no emailRedirectTo → no magic link CTA
      });
      if (error) throw error;
      setEmailOtpSentTo(email.trim());
      setMsg('We sent a 6-digit code (expires in 5 minutes).');
      setTimeout(() => emailCodeRef.current?.focus(), 50);
    } catch (e: any) {
      setErr(e?.message || 'Could not send code. Please try again.');
      console.error('sendEmailOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailOtp() {
    if (!emailOtpSentTo || loading) return;
    setErr(null); setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        type: 'email',
        email: emailOtpSentTo,
        token: emailCode.trim(),
      });
      if (error) throw error;

      const session = await waitForSession();
      if (!session) throw new Error('Session not ready. Please try again.');

      router.replace('/onboard?src=otp');
    } catch (e: any) {
      setErr(e?.message || 'Invalid or expired code.');
      console.error('verifyEmailOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the DAO Party<br className="hidden md:block" /> of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Choose <b>Phone OTP</b> or <b>Email OTP</b>. Once verified, we’ll take you to onboarding.
        </p>
      </header>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          {/* Tabs */}
          <div className="flex gap-2 rounded-xl bg-white/5 p-1 mb-6">
            <button
              onClick={() => setTab('phone')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab==='phone' ? 'bg-white text-black' : 'text-slate-300'}`}
            >
              Phone OTP
            </button>
            <button
              onClick={() => setTab('email')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab==='email' ? 'bg-white text-black' : 'text-slate-300'}`}
            >
              Email OTP
            </button>
          </div>

          {tab === 'phone' && (
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={country.dial}
                  onChange={(e) => {
                    const next = (COUNTRIES as Country[]).find(c => c.dial === e.target.value) || (COUNTRIES[0] as Country);
                    setCountry(next);
                  }}
                  className="rounded-xl bg-transparent border border-white/15 px-3 py-2"
                  aria-label="Select country code"
                >
                  {(COUNTRIES as Country[]).map((c, i) => (
                    <option key={`${c.dial}-${i}`} value={c.dial} className="bg-slate-900">
                      {c.flag} {c.name} (+{c.dial})
                    </option>
                  ))}
                </select>
                <input
                  ref={phoneInputRef}
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  placeholder="98••••••••"
                  className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
                  aria-label="Phone number"
                />
              </div>

              {!otpSentTo ? (
                <button
                  onClick={sendOtp}
                  disabled={loading || !phoneRaw.trim()}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-emerald-400 text-black font-semibold disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              ) : (
                <div className="mt-4">
                  <label className="block text-xs text-slate-300/70 mb-1">
                    Enter 6-digit code sent to <b>{otpSentTo}</b>
                  </label>
                  {/* Single numeric field — paste-friendly, autosubmit on 6 */}
                  <input
                    ref={otpInputRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => {
                      const s = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(s);
                      if (s.length === 6) setTimeout(verifyOtp, 10);
                    }}
                    onPaste={(e) => {
                      const s = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                      if (s) { e.preventDefault(); setOtp(s); setTimeout(verifyOtp, 10); }
                    }}
                    placeholder="______"
                    className="w-full rounded-xl bg-white text-black dark:bg-neutral-900 dark:text-white border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="One-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyOtp}
                      disabled={loading || otp.length !== 6}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
                    >
                      Verify & Continue
                    </button>
                    <button
                      onClick={() => { setOtpSentTo(null); setOtp(''); setMsg(null); setErr(null); phoneInputRef.current?.focus(); }}
                      className="px-4 py-3 rounded-2xl border border-white/15"
                    >
                      Change number
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">
                We never reveal whether a number exists—generic errors protect your privacy.
              </p>
            </div>
          )}

          {tab === 'email' && (
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Email</label>
              {!emailOtpSentTo ? (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
                    aria-label="Email address"
                  />
                  <button
                    onClick={sendEmailOtp}
                    disabled={loading || !email.trim()}
                    className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
                  >
                    {loading ? 'Sending…' : 'Send 6-digit code'}
                  </button>
                </>
              ) : (
                <div className="mt-1">
                  <label className="block text-xs text-slate-300/70 mb-1">
                    Enter 6-digit code sent to <b>{emailOtpSentTo}</b>
                  </label>
                  <input
                    ref={emailCodeRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={emailCode}
                    onChange={(e) => {
                      const s = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setEmailCode(s);
                      if (s.length === 6) setTimeout(verifyEmailOtp, 10);
                    }}
                    onPaste={(e) => {
                      const s = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                      if (s) { e.preventDefault(); setEmailCode(s); setTimeout(verifyEmailOtp, 10); }
                    }}
                    placeholder="______"
                    className="w-full rounded-xl bg-white text-black dark:bg-neutral-900 dark:text-white border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="Email one-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyEmailOtp}
                      disabled={loading || emailCode.length !== 6}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
                    >
                      Verify & Continue
                    </button>
                    <button
                      onClick={() => { setEmailOtpSentTo(null); setEmailCode(''); setMsg(null); setErr(null); }}
                      className="px-4 py-3 rounded-2xl border border-white/15"
                    >
                      Change email
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                We never reveal whether an email exists—generic errors protect your privacy.
              </p>
            </div>
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>
    </main>
  );
}

// Default export wrapped in Suspense to satisfy App Router CSR bailout rules
export default function JoinClient() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-black" />}>
      <JoinClientBody />
    </Suspense>
  );
}
