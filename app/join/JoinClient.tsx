// app/join/JoinClient.tsx — Minimal, production-tight Join (Auth-only) → /onboard
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { verifyOtpAndSync } from '@/lib/auth/verifyOtpClient';
import { waitForSession } from '@/lib/auth/waitForSession';
import { COUNTRIES } from '@/app/data/countries';

type Country = { flag: string; dial: string; name: string };

// ---------- Small utilities ----------
function e164(countryDial: string, raw: string) {
  const digits = raw.replace(/\D/g, '');
  const d = countryDial.replace(/\D/g, '');
  if (digits.startsWith(d)) return `+${digits}`;
  return `+${d}${digits}`;
}

async function waitForSupabaseSession(timeoutMs = 8000) {
  const delayMs = 250;
  const tries = Math.ceil(timeoutMs / delayMs);
  const ready = await waitForSession(supabase, tries, delayMs);
  if (!ready) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
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

  // Email
  const [email, setEmail] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Canonical host for magic-link return + wrong-host bounce
  const SITE_URL = useMemo(
    () => (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, ''),
    []
  );

  // Boot: if already signed in, or returning via magic link
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // already authenticated? → go to /onboard
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess) {
        router.replace('/onboard?src=join');
        return;
      }

      // handle magic-link return (hash params)
      const { hash, origin, pathname } = window.location;
      const hasAccessToken = !!hash && hash.includes('access_token=');
      if (!hasAccessToken) return;

      // wait for Supabase to hydrate the session from hash
      const session = await waitForSupabaseSession();
      if (!session) return;

      // strip hash, then continue to onboard
      const clean = new URL(`${origin}${pathname}`);
      window.history.replaceState({}, '', clean.toString());
      if (!cancelled) router.replace('/onboard?src=ml');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ---------- Actions: Phone OTP ----------
  async function sendOtp() {
    if (loading) return; // prevent double-tap
    setErr(null); setMsg(null); setLoading(true);

    try {
      const phone = e164(country.dial, phoneRaw);
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
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));

      setOtpSentTo(phone);
      setMsg('We sent a 6-digit code (expires in 5 minutes).');
      setTimeout(() => otpInputRef.current?.focus(), 50);
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
      await verifyOtpAndSync({ type: 'sms', phone: otpSentTo, token: otp.trim() });
      router.push('/onboard?src=join');
    } catch (e: any) {
      setErr(e?.message || 'Invalid or expired code.');
      // eslint-disable-next-line no-console
      console.error('verifyOtp error:', e);
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
          Choose <b>Phone OTP</b> or <b>Email Magic Link</b>. Once verified, we’ll take you to onboarding.
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
              Email Link
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
                  <input
                    ref={otpInputRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={(e) => {
                      const s = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                      if (s) { e.preventDefault(); setOtp(s); }
                    }}
                    placeholder="••••••"
                    className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="One-time code"
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
                      onClick={() => { setOtpSentTo(null); setOtp(''); setMsg(null); setErr(null); }}
                      className="px-4 py-3 rounded-2xl border border-white/15"
                    >
                      Change number
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">
                We keep our promises when voices are verified.
              </p>
            </div>
          )}

          {tab === 'email' && (
            <EmailPane SITE_URL={SITE_URL} email={email} setEmail={setEmail} setErr={setErr} setMsg={setMsg} loading={loading} setLoading={setLoading} />
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>
    </main>
  );
}

// Separate email pane to keep JoinClient readable
function EmailPane({
  SITE_URL, email, setEmail, setErr, setMsg, loading, setLoading,
}: {
  SITE_URL: string;
  email: string;
  setEmail: (v: string) => void;
  setErr: (v: string | null) => void;
  setMsg: (v: string | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  async function sendMagicLink() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/onboard?src=join` },
      });
      if (error) throw error;
      setMsg('Check your email and tap the magic link. You will return here.');
    } catch (e: any) {
      setErr(e?.message || 'Could not send magic link.');
      // eslint-disable-next-line no-console
      console.error('sendMagicLink error:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs text-slate-300/70 mb-1">Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
        aria-label="Email address"
      />
      <button
        onClick={sendMagicLink}
        disabled={loading || !email.trim()}
        className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
      >
        {loading ? 'Sending…' : 'Send Magic Link'}
      </button>
      <p className="text-[11px] text-slate-400 mt-2">
        Tap the link in your email. You’ll return here and we’ll redirect you to onboarding.
      </p>
    </div>
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
