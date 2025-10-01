// app/join/page.tsx — Join → OnboardingFlow (with searchable Country Picker)
// Next.js App Router + Supabase + Vercel
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';
import { COUNTRIES } from '@/app/data/countries';
import { createClient } from '@supabase/supabase-js';

// Shape expected from app/data/countries.ts
type Country = { flag: string; dial: string; name: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Phase = 'auth' | 'verify' | 'onboarding';
type Channel = 'phone' | 'email';

/** Canonical domain + callback (overridable by env) */
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://www.gatishilnepal.org');
const CALLBACK = `${SITE_URL}/join?onboarding=1`;

/** Simple E.164 check (+97798… etc.) */
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
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Phase & channel
  const [phase, setPhase] = useState<Phase>('auth');
  const [channel, setChannel] = useState<Channel>('phone');

  // Country + phone
  const defaultCountry = (Array.isArray(COUNTRIES) && COUNTRIES.length
    ? COUNTRIES[0]
    : { flag: '🇳🇵', dial: '977', name: 'Nepal' }) as Country;

  const [country, setCountry] = useState<Country>(defaultCountry);
  const [showPicker, setShowPicker] = useState(false);
  const [localNumber, setLocalNumber] = useState('');
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // OTP + Email
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  // Optional prefill
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  // Fast-path for existing session
  useEffect(() => {
    (async () => {
      const { data: { session} } = await supabase.auth.getSession();
      const wantsOnboarding = params.get('onboarding') === '1';
      if (session && wantsOnboarding) { setPhase('onboarding'); return; }
      if (session && !wantsOnboarding) { router.replace('/dashboard'); return; }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Magic-link flow: WAIT for session before stripping hash; normalize to canonical
  useEffect(() => {
    let alive = true;

    async function waitForSession(maxTries = 40, delayMs = 100) {
      for (let i = 0; i < maxTries; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return null;
        if (session) return session;
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return null;
    }

    (async () => {
      if (typeof window === 'undefined') return;

      const { hash, origin, pathname, search } = window.location;
      const wantsOnboarding =
        new URLSearchParams(search).get('onboarding') === '1';
      const hasAccessToken = hash && hash.includes('access_token=');

      // Arrived via magic-link
      if (hasAccessToken) {
        // If on wrong host, go to canonical callback first
        if (!origin.startsWith(SITE_URL)) {
          window.location.replace(CALLBACK);
          return;
        }

        // On canonical host: WAIT for Supabase to hydrate the session…
        const session = await waitForSession();

        // …then clean URL (strip hash, enforce onboarding=1)
        const clean = new URL(`${origin}${pathname}`);
        clean.searchParams.set('onboarding', '1');
        window.history.replaceState({}, '', clean.toString());

        // Enter onboarding once session exists
        if (session && wantsOnboarding) {
          setPhase('onboarding');
          return;
        }
      } else {
        // No hash; if already authenticated + onboarding requested, go in
        const { data: { session } } = await supabase.auth.getSession();
        if (session && wantsOnboarding) { setPhase('onboarding'); return; }
        if (session && !wantsOnboarding) { router.replace('/dashboard'); return; }
      }
    })();

    return () => { alive = false; };
  }, [router]);

  // Safety net: react to late hydration or provider callbacks
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const wantsOnboarding =
        new URLSearchParams(window.location.search).get('onboarding') === '1';
      if (session && wantsOnboarding) {
        setPhase('onboarding');
      } else if (session && !wantsOnboarding) {
        router.replace('/dashboard');
      }
    });
    return () => { sub.subscription?.unsubscribe?.(); };
  }, [router]);

  // PHONE OTP — send (custom API using public.otps)
  async function sendPhoneOtp() {
    resetAlerts();
    if (!isE164(e164)) { setErr('Please enter a valid phone number.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setErr(httpErr(res, data)); return; }
      if (!data?.ok) { setErr(data?.error || 'Failed to send OTP'); return; }
      setMsg('OTP sent. Check your SMS and enter the 6-digit code.');
      setPhase('verify');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending OTP');
    } finally { setLoading(false); }
  }

  // PHONE OTP — verify (custom API)
  async function verifyPhoneOtp() {
    resetAlerts();
    if (!/^\d{6}$/.test(otp.trim())) { setErr('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, code: otp.trim(), name, role }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setErr(httpErr(res, data)); return; }
      if (!data?.ok) { setErr(data?.error || 'Invalid code'); return; }
      // Session now active; continue onboarding in place
      setPhase('onboarding');
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
    } finally { setLoading(false); }
  }

  // EMAIL — magic link → always to canonical /join?onboarding=1
  async function sendEmailMagicLink() {
    resetAlerts();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: CALLBACK, // force canonical domain
        },
      });
      if (error) { setErr(error.message); return; }
      setMsg('Check your email and tap the magic link. It opens on gatishilnepal.org.');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending magic link');
    } finally { setLoading(false); }
  }

  // Onboarding
  if (phase === 'onboarding') return <OnboardingFlow />;

  // ---------------- UI ----------------
  return (
    <main className="min-h-dvh bg-black text-white">
      {/* Hero */}
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-rose-300">DAO Party</span><br className="hidden md:block" />
          of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Two simple ways: <b>Phone OTP</b> or <b>Email Magic Link</b>. After verification, onboarding opens right here.
        </p>
      </header>

      {/* Card */}
      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          {/* Personalize (optional) */}
          <details className="rounded-xl border border-white/10 bg-white/5">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm text-slate-200 rounded-xl">
              ✨ Personalize (optional)
            </summary>
            <div className="grid grid-cols-1 gap-3 p-3 pt-0">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sushila Tamang"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">How will you help? (Role)</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., Organizer, Farmer, Volunteer"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                This only shapes your welcome and recommendations. Skip anytime — you can set it later.
              </p>
            </div>
          </details>

          {/* Tabs */}
          <div className="mt-5 flex gap-2 text-sm">
            <button
              onClick={() => { setChannel('phone'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel === 'phone' ? 'bg-white text-black' : 'border-white/15 hover:bg-white/5')}
            >
              📱 Phone
            </button>
            <button
              onClick={() => { setChannel('email'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel === 'email' ? 'bg-white text-black' : 'border-white/15 hover:bg-white/5')}
            >
              ✉️ Email
            </button>
          </div>

          {/* PHONE FLOW */}
          {channel === 'phone' && phase === 'auth' && (
            <form onSubmit={(e) => { e.preventDefault(); sendPhoneOtp(); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Phone</label>

                {/* Country trigger (opens full-screen picker) */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-2 rounded-xl bg-transparent border border-white/15 px-3 py-2 hover:bg-white/5"
                    aria-label="Select country"
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="hidden sm:inline text-slate-200">{country.name}</span>
                    <span className="opacity-70">+{country.dial}</span>
                    <svg className="ml-1 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" /></svg>
                  </button>

                  <input
                    value={localNumber}
                    onChange={(e) => setLocalNumber(e.target.value)}
                    placeholder="98XXXXXXXX"
                    inputMode="numeric"
                    className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                  />
                </div>

                <div className="text-xs opacity-70 mt-1">
                  Will send OTP to <code>{e164 || `+${country.dial}…`}</code>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Message & data rates may apply. By continuing, you agree to tamper-proof decisions.
              </p>
            </form>
          )}

          {channel === 'phone' && phase === 'verify' && (
            <form onSubmit={(e) => { e.preventDefault(); verifyPhoneOtp(); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Enter 6-digit code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Start Onboarding'}
              </button>
            </form>
          )}

          {/* EMAIL FLOW */}
          {channel === 'email' && phase === 'auth' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={sendEmailMagicLink}
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                After you tap the link, you’ll return here and onboarding opens automatically.
              </p>
            </div>
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>

      {/* COUNTRY PICKER (full-screen modal) */}
      {showPicker && (
        <CountryPicker
          countries={COUNTRIES as Country[]}
          selectedDial={country.dial}
          onClose={() => setShowPicker(false)}
          onSelect={(c) => { setCountry(c); setShowPicker(false); }}
        />
      )}
    </main>
  );
}

/* ---------------- Country Picker ---------------- */
function CountryPicker({
  countries,
  selectedDial,
  onClose,
  onSelect,
}: {
  countries: Country[];
  selectedDial: string;
  onClose: () => void;
  onSelect: (c: Country) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.dial.toLowerCase().includes(term) ||
        c.flag.includes(term) // harmless; allows emoji paste search
    );
  }, [q, countries]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
        <button
          onClick={onClose}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Go back"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2 className="text-lg font-semibold">Select Country</h2>
      </div>

      <div className="mt-14 px-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
          <svg className="h-5 w-5 opacity-70" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="mt-3 pb-6 h-[calc(100dvh-150px)] overflow-y-auto px-2">
        <ul className="divide-y divide-white/5">
          {filtered.map((c, idx) => {
            const active = c.dial === selectedDial;
            return (
              <li key={`${c.dial}-${idx}`}>
                <button
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/5"
                  aria-label={`Choose ${c.name}`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs opacity-70">+{c.dial}</div>
                  </div>
                  {active && (
                    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No matches.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Utilities ---------------- */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await res.json(); } catch { return {}; } }
  const txt = await res.text().catch(() => ''); try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}
