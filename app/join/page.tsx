// app/join/page.tsx — Minimal, production-tight Join (Auth-only) → redirect to /onboarding
// - Two channels: Phone OTP (via /api/otp/*) and Email Magic Link (Supabase)
// - Handles magic-link return (hash), wrong-host bounce, URL cleanup
// - If already signed-in, idempotently redirects to /onboarding
// - No OnboardingFlow here; /onboarding owns the flow

'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { COUNTRIES } from '@/app/data/countries';

/** Types */
type Country = { flag: string; dial: string; name: string };

/** Env */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, ''); // e.g., https://gatishilnepal.org

/** Utilities */
async function waitForSession(timeoutMs = 8000): Promise<import('@supabase/supabase-js').Session | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    const s = data?.session ?? null;
    if (s) return s;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

function e164(countryDial: string, raw: string) {
  const digits = raw.replace(/\D/g, '');
  const d = countryDial.replace(/\D/g, '');
  // If user typed a full international already, prefer it
  if (digits.startsWith(d)) return `+${digits}`;
  return `+${d}${digits}`;
}

function JoinClient() {
  const router = useRouter();
  const params = useSearchParams();

  /** Tabs */
  const [tab, setTab] = useState<'phone' | 'email'>('phone');

  /** Phone */
  const [country, setCountry] = useState<Country>(() => (COUNTRIES as Country[])[0]);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  /** Email */
  const [email, setEmail] = useState('');

  /** UI */
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // --------------- Boot: handle existing session or magic-link return -----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If already authenticated, skip join
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess) {
        router.replace('/onboarding?src=join');
        return;
      }

      // Handle magic-link return via hash fragment
      const { hash, origin, pathname } = window.location;
      const hasAccessToken = !!hash && hash.includes('access_token=');
      if (!hasAccessToken) return;

      // Wrong-host bounce (keep hash intact)
      if (SITE_URL && !origin.startsWith(SITE_URL)) {
        window.location.replace(`${SITE_URL}/join${hash}`);
        return;
      }

      // On canonical host; wait for Supabase to hydrate session from hash
      const session = await waitForSession();
      if (!session) return; // let the user retry

      // Clean URL (strip hash), then go to onboarding
      const clean = new URL(`${origin}${pathname}`);
      window.history.replaceState({}, '', clean.toString());
      if (!cancelled) router.replace('/onboarding?src=ml');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // --------------- Actions: OTP ----------------------
  async function sendOtp() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const phone = e164(country.dial, phoneRaw);
      const res = await fetch('/api/otp/send', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));
      setOtpSentTo(phone);
      setMsg('We sent a 6‑digit code (expires in 5 minutes).');
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } catch (e: any) {
      setErr(e?.message || 'Could not send OTP. Try again.');
    } finally { setLoading(false); }
  }

  async function verifyOtp() {
    if (!otpSentTo) return;
    setErr(null); setMsg(null); setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: otpSentTo, code: otp.trim() })
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));

      // Server sets Supabase session; redirect to onboarding
      const session = await waitForSession();
      if (!session) throw new Error('Session not ready. Please try again.');
      router.replace('/onboarding?src=otp');
    } catch (e: any) {
      setErr(e?.message || 'Invalid or expired code.');
    } finally { setLoading(false); }
  }

  // --------------- Actions: Magic Link ---------------
  async function sendMagicLink() {
    setErr(null); setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${SITE_URL || window.location.origin}/join` } });
      if (error) throw error;
      setMsg('Check your email and tap the magic link. You will return here.');
    } catch (e: any) {
      setErr(e?.message || 'Could not send magic link.');
    } finally { setLoading(false); }
  }

  // --------------- Render ----------------------------
  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">GATISHILNEPAL.ORG</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">Join the DAO Party<br className="hidden md:block" /> of the Powerless.</h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">Choose <b>Phone OTP</b> or <b>Email Magic Link</b>. Once verified, we’ll take you to onboarding.</p>
      </header>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          {/* Tabs */}
          <div className="flex gap-2 rounded-xl bg-white/5 p-1 mb-6">
            <button onClick={() => setTab('phone')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab==='phone' ? 'bg-white text-black' : 'text-slate-300'}`}>Phone OTP</button>
            <button onClick={() => setTab('email')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab==='email' ? 'bg-white text-black' : 'text-slate-300'}`}>Email Link</button>
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
                    <option key={`${c.dial}-${i}`} value={c.dial} className="bg-slate-900">{c.flag} {c.name} (+{c.dial})</option>
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
                <button onClick={sendOtp} disabled={loading || !phoneRaw.trim()} className="mt-4 w-full px-4 py-3 rounded-2xl bg-emerald-400 text-black font-semibold disabled:opacity-60">{loading ? 'Sending…' : 'Send OTP'}</button>
              ) : (
                <div className="mt-4">
                  <label className="block text-xs text-slate-300/70 mb-1">Enter 6‑digit code sent to <b>{otpSentTo}</b></label>
                  <input
                    ref={otpInputRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="One-time code"
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={verifyOtp} disabled={loading || otp.length !== 6} className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60">Verify & Continue</button>
                    <button onClick={() => { setOtpSentTo(null); setOtp(''); setMsg(null); setErr(null); }} className="px-4 py-3 rounded-2xl border border-white/15">Change number</button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">We never show whether a number exists—generic errors protect your privacy.</p>
            </div>
          )}

          {tab === 'email' && (
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
              <button onClick={sendMagicLink} disabled={loading || !email.trim()} className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60">{loading ? 'Sending…' : 'Send Magic Link'}</button>
              <p className="text-[11px] text-slate-400 mt-2">Tap the link in your email. You’ll return here and we’ll redirect you to onboarding.</p>
            </div>
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>
    </main>
  );
}

/** Fetch helpers */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await res.json(); } catch { return {}; } }
  const txt = await res.text().catch(() => '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-black" />}> 
      <JoinClient />
    </Suspense>
  );
}

