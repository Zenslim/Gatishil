// app/join/page.tsx — Join (Phone OTP + Email) with robust Country Picker
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// --- Flexible import for whatever countries.ts exports ---
import * as CountriesFile from '@/app/data/countries';
// Accepts: default export, COUNTRIES, countries, list, or raw object
const RAW_COUNTRIES: any =
  (CountriesFile as any).COUNTRIES ??
  (CountriesFile as any).countries ??
  (CountriesFile as any).list ??
  (CountriesFile as any).default ??
  CountriesFile;

// ---------- Types ----------
type Country = {
  code: string;    // ISO-3166 alpha-2 (e.g., "NP")
  name: string;    // Derived via Intl if missing
  dial?: string;   // digits only (e.g., "977")
  flag: string;    // emoji flag
};

// ---------- Supabase ----------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- Helpers ----------
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function codeToFlag(code: string) {
  const cc = (code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  // Regional Indicator Symbols
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65)));
}

function pickDial(x: any): string | undefined {
  // try several common property names and shapes
  const candidates = [
    x?.dial, x?.dial_code, x?.callingCode, x?.callingCodes, x?.phoneCode, x?.phone, x?.code // sometimes 'code' holds "+977"
  ].filter(Boolean);

  for (const c of candidates) {
    if (Array.isArray(c) && c.length) {
      const s = String(c[0]);
      const digits = s.replace(/[^\d]/g, '');
      if (digits) return digits;
    } else if (typeof c === 'string' || typeof c === 'number') {
      const s = String(c);
      const digits = s.replace(/[^\d]/g, '');
      if (digits) return digits;
    }
  }
  return undefined;
}

function pickCode(x: any): string | undefined {
  // common keys: code, cca2, iso2, alpha2, countryCode
  const c = x?.code ?? x?.cca2 ?? x?.iso2 ?? x?.alpha2 ?? x?.countryCode ?? x;
  if (typeof c === 'string') return c.toUpperCase();
  return undefined;
}

// Normalize whatever countries.ts provides into Country[]
function normalizeCountries(raw: any): Country[] {
  try {
    if (!raw) return [];
    // Map/object form: { NP: {dial:977}, AF:{}, ... }
    if (!Array.isArray(raw) && typeof raw === 'object') {
      return Object.entries(raw).map(([k, v]) => {
        const code = pickCode(k) || pickCode(v) || '';
        const name = regionNames.of(code) || code || 'Unknown';
        const flag = codeToFlag(code);
        const dial = pickDial(v);
        return { code, name, flag, dial };
      }).filter(c => c.code);
    }

    // Array form
    if (Array.isArray(raw)) {
      return raw.map((item) => {
        // item may be a string code or an object
        if (typeof item === 'string') {
          const code = pickCode(item) || '';
          const name = regionNames.of(code) || code || 'Unknown';
          const flag = codeToFlag(code);
          const dial = undefined; // unknown unless provided elsewhere
          return { code, name, flag, dial };
        } else {
          const code = pickCode(item) || '';
          const name = (item?.name && String(item.name)) || regionNames.of(code) || code || 'Unknown';
          const flag = (item?.flag && String(item.flag)) || codeToFlag(code);
          const dial = pickDial(item);
          return { code, name, flag, dial };
        }
      }).filter(c => c.code);
    }

    // Fallback: nothing usable
    return [];
  } catch {
    return [];
  }
}

const COUNTRIES: Country[] = normalizeCountries(RAW_COUNTRIES);

// Prefer Nepal if present, else first item
const DEFAULT_COUNTRY: Country =
  COUNTRIES.find(c => c.code === 'NP') ??
  COUNTRIES[0] ??
  { code: 'NP', name: regionNames.of('NP') || 'Nepal', dial: '977', flag: codeToFlag('NP') };

// Phone number helpers
const isE164 = (s: string) => /^\+\d{8,15}$/.test((s || '').trim());

// Canonical callback target
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://www.gatishilnepal.org');
const CALLBACK = `${SITE_URL}/join?onboarding=1`;

// ---------- Page ----------
export default function JoinPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh grid place-items-center bg-black text-slate-300">Loading…</main>}>
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();

  type Phase = 'auth' | 'verify' | 'onboarding';
  type Channel = 'phone' | 'email';

  const [phase, setPhase] = useState<Phase>('auth');
  const [channel, setChannel] = useState<Channel>('phone');

  // Country + phone
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [localNumber, setLocalNumber] = useState('');
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    const dial = (country?.dial || '').replace(/\D/g, '');
    if (!dial) return ''; // force user to pick a country that has a dial code
    return digits ? `+${dial}${digits}` : '';
  }, [country, localNumber]);

  // OTP / Email
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  // Existing session fast-path
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const wantsOnboarding = params.get('onboarding') === '1';
      if (session && wantsOnboarding) { setPhase('onboarding'); return; }
      if (session && !wantsOnboarding) { router.replace('/dashboard'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle magic-link callbacks safely
  useEffect(() => {
    let alive = true;

    async function waitForSession(max = 40, delay = 100) {
      for (let i = 0; i < max; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return null;
        if (session) return session;
        await new Promise(r => setTimeout(r, delay));
      }
      return null;
    }

    (async () => {
      if (typeof window === 'undefined') return;

      const { hash, origin, pathname, search } = window.location;
      const wantsOnboarding = new URLSearchParams(search).get('onboarding') === '1';
      const hasAccessToken = hash && hash.includes('access_token=');

      if (hasAccessToken) {
        if (!origin.startsWith(SITE_URL)) {
          window.location.replace(CALLBACK);
          return;
        }
        const session = await waitForSession();
        const clean = new URL(`${origin}${pathname}`);
        clean.searchParams.set('onboarding', '1');
        window.history.replaceState({}, '', clean.toString());
        if (session && wantsOnboarding) setPhase('onboarding');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && wantsOnboarding) setPhase('onboarding');
        if (session && !wantsOnboarding) router.replace('/dashboard');
      }
    })();

    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const wants = new URLSearchParams(window.location.search).get('onboarding') === '1';
      if (session && wants) setPhase('onboarding');
      else if (session && !wants) router.replace('/dashboard');
    });
    return () => { sub.subscription?.unsubscribe?.(); };
  }, [router]);

  // --- Actions ---
  async function sendPhoneOtp() {
    resetAlerts();
    if (!country?.dial) { setErr('Please choose a country with a calling code.'); return; }
    if (!isE164(e164)) { setErr('Enter a valid phone number.'); return; }
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
      setPhase('onboarding');
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
    } finally { setLoading(false); }
  }

  async function sendEmailMagicLink() {
    resetAlerts();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: CALLBACK },
      });
      if (error) { setErr(error.message); return; }
      setMsg('Check your email and tap the magic link. It returns you here.');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending magic link');
    } finally { setLoading(false); }
  }

  if (phase === 'onboarding') {
    const OnboardingFlow = require('@/components/OnboardingFlow').default;
    return <OnboardingFlow />;
  }

  // ---------- UI ----------
  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-rose-300">DAO Party</span>
          <br className="hidden md:block" />of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Verify with <b>Phone OTP</b> or <b>Email Magic Link</b>. After that, onboarding opens here.
        </p>
      </header>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          {/* Personalize (optional) */}
          <details className="rounded-xl border border-white/10 bg-white/5">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm text-slate-200 rounded-xl">✨ Personalize (optional)</summary>
            <div className="grid grid-cols-1 gap-3 p-3 pt-0">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Sushila Tamang"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">How will you help? (Role)</label>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Organizer, Farmer, Volunteer"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
              </div>
            </div>
          </details>

          {/* Tabs */}
          <div className="mt-5 flex gap-2 text-sm">
            <button onClick={() => { setChannel('phone'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel === 'phone' ? 'bg-white text-black' : 'border-white/15 hover:bg-white/5')}>
              📱 Phone
            </button>
            <button onClick={() => { setChannel('email'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel === 'email' ? 'bg-white text-black' : 'border-white/15 hover:bg-white/5')}>
              ✉️ Email
            </button>
          </div>

          {/* PHONE AUTH */}
          {channel === 'phone' && phase === 'auth' && (
            <form onSubmit={(e) => { e.preventDefault(); sendPhoneOtp(); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Phone</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPicker(true)}
                    className="flex items-center gap-2 rounded-xl bg-transparent border border-white/15 px-3 py-2 hover:bg-white/5">
                    <span className="text-lg">{country.flag}</span>
                    <span className="hidden sm:inline text-slate-200">{country.name}</span>
                    <span className="opacity-70">+{country.dial ?? '—'}</span>
                    <svg className="ml-1 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <input value={localNumber} onChange={(e) => setLocalNumber(e.target.value)} placeholder="98XXXXXXXX"
                    inputMode="numeric"
                    className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
                </div>
                <div className="text-xs opacity-70 mt-1">We’ll send to <code>{e164 || (country.dial ? `+${country.dial}…` : 'select a country')}</code></div>
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60">
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* PHONE VERIFY */}
          {channel === 'phone' && phase === 'verify' && (
            <form onSubmit={(e) => { e.preventDefault(); verifyPhoneOtp(); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Enter 6-digit code</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="••••••" inputMode="numeric"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60">
                {loading ? 'Verifying…' : 'Verify & Start Onboarding'}
              </button>
            </form>
          )}

          {/* EMAIL */}
          {channel === 'email' && phase === 'auth' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
              </div>
              <button onClick={sendEmailMagicLink} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60">
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </div>
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>

      {/* COUNTRY PICKER */}
      {showPicker && (
        <CountryPicker
          countries={COUNTRIES}
          selectedCode={country.code}
          onClose={() => setShowPicker(false)}
          onSelect={(c) => { setCountry(c); setShowPicker(false); }}
        />
      )}
    </main>
  );
}

// ---------- Country Picker (safe search; never crashes) ----------
function CountryPicker({
  countries,
  selectedCode,
  onClose,
  onSelect,
}: {
  countries: Country[];
  selectedCode: string;
  onClose: () => void;
  onSelect: (c: Country) => void;
}) {
  const [q, setQ] = useState('');

  const normalizedQuery = (q ?? '').toString().trim().toLowerCase();

  const filtered = useMemo(() => {
    const term = normalizedQuery;
    if (!term) return countries;
    return countries.filter((c) => {
      const name = (c?.name ?? '').toString().toLowerCase();
      const code = (c?.code ?? '').toString().toLowerCase();
      const dial = (c?.dial ?? '').toString().toLowerCase();
      return name.includes(term) || code.includes(term) || (`+${dial}`).includes(term);
    });
  }, [countries, normalizedQuery]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Go back">
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
            placeholder="Search by name, code, or +dial"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="mt-3 pb-6 h-[calc(100dvh-150px)] overflow-y-auto px-2">
        <ul className="divide-y divide-white/5">
          {filtered.map((c) => {
            const active = c.code === selectedCode;
            return (
              <li key={c.code}>
                <button
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/5"
                  aria-label={`Choose ${c.name}`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{c.name || c.code}</div>
                    <div className="text-xs opacity-70">+{c.dial ?? '—'} · {c.code}</div>
                  </div>
                  {active && (
                    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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

// ---------- Utilities ----------
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { return await res.json(); } catch { return {}; } }
  const txt = await res.text().catch(() => ''); try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}
