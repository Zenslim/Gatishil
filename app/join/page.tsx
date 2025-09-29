// app/join/page.tsx — Join → OnboardingFlow (no /security)
// Stack: Next.js App Router + Supabase + Vercel
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';
import { createClient } from '@supabase/supabase-js';
import type { CountryDial } from '@/app/data/countries';
import { COUNTRIES } from '@/app/data/countries';

// Supabase client (browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Phase = 'auth' | 'verify' | 'onboarding';
type Channel = 'phone' | 'email';

export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Phase & channel
  const [phase, setPhase] = useState<Phase>('auth');
  const [channel, setChannel] = useState<Channel>('phone');

  // Country + phone
  const [country, setCountry] = useState<CountryDial>(COUNTRIES[0]); // 🇳🇵 default
  const [localNumber, setLocalNumber] = useState('');
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // OTP input
  const [otp, setOtp] = useState('');

  // Email
  const [email, setEmail] = useState('');

  // Optional prefill for onboarding
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  // Fast-path: session → /dashboard unless explicitly returning for onboarding
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const wantsOnboarding = params.get('onboarding') === '1';
      if (session && wantsOnboarding) { setPhase('onboarding'); return; }
      if (session && !wantsOnboarding) { router.replace('/dashboard'); return; }
      // else stay in auth
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Safely parse JSON; falls back to text if not JSON. */
  async function safeJson(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { return await res.json(); } catch { return {}; }
    }
    const txt = await res.text().catch(() => '');
    try { return JSON.parse(txt); } catch { return { raw: txt }; }
  }
  function httpErr(res: Response, data: any) {
    return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
  }

  // PHONE OTP — send
  async function sendPhoneOtp() {
    resetAlerts();
    if (!/^\+\d{8,15}$/.test(e164)) { setErr('Enter a valid phone number.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // PHONE OTP — verify
  async function verifyPhoneOtp() {
    resetAlerts();
    if (!/^\d{6}$/.test(otp.trim())) { setErr('Enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, code: otp.trim(), name, role }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setErr(httpErr(res, data)); return; }
      if (!data?.ok) { setErr(data?.error || 'Invalid code'); return; }
      // Session is now active → go straight to onboarding (same page)
      setPhase('onboarding');
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
    } finally { setLoading(false); }
  }

  // EMAIL — magic link -> redirect back to /join?onboarding=1
  async function sendEmailMagicLink() {
    resetAlerts();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/join?onboarding=1`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) { setErr(error.message); return; }
      setMsg('Check your email and tap the magic link to continue onboarding here.');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending magic link');
    } finally { setLoading(false); }
  }

  // ONBOARDING PHASE
  if (phase === 'onboarding') {
    return <OnboardingFlow />;
  }

  // AUTH PHASE (Phone / Email)
  return (
    <main className="min-h-dvh p-6 md:p-10 text-white bg-gradient-to-b from-slate-900 to-black">
      <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-widest text-sky-300/80">GatishilNepal.org</p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2">Join in</h1>
        <p className="text-slate-300/90 mt-2">
          Two simple ways: <b>Phone OTP</b> or <b>Email Magic Link</b>. After verification, onboarding opens right here.
        </p>

        {/* Optional prefill */}
        <div className="grid grid-cols-1 gap-3 mt-5">
          <div>
            <label className="block text-xs text-slate-300/70 mb-1">Name (optional)</label>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="e.g., Sushila Tamang"
              className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300/70 mb-1">Role (optional)</label>
            <input
              value={role}
              onChange={(e)=>setRole(e.target.value)}
              placeholder="e.g., Organizer, Farmer, Volunteer"
              className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Channel tabs */}
        <div className="mt-5 flex gap-2 text-sm">
          <button
            onClick={()=>{ setChannel('phone'); resetAlerts(); setPhase('auth'); }}
            className={'px-3 py-2 rounded-xl border ' + (channel==='phone'?'bg-white text-black':'border-white/15')}
          >
            📱 Phone
          </button>
          <button
            onClick={()=>{ setChannel('email'); resetAlerts(); setPhase('auth'); }}
            className={'px-3 py-2 rounded-xl border ' + (channel==='email'?'bg-white text-black':'border-white/15')}
          >
            ✉️ Email
          </button>
        </div>

        {/* PHONE FLOW */}
        {channel==='phone' && phase==='auth' && (
          <form onSubmit={(e)=>{ e.preventDefault(); sendPhoneOtp(); }} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={country.dial}
                  onChange={(e) => {
                    const next = COUNTRIES.find(c => c.dial === e.target.value) || COUNTRIES[0];
                    setCountry(next);
                  }}
                  className="rounded-xl bg-transparent border border-white/15 px-3 py-2"
                >
                  {COUNTRIES.map((c, i) => (
                    <option key={`${c.dial}-${i}`} value={c.dial} className="bg-slate-900">
                      {c.flag} +{c.dial}
                    </option>
                  ))}
                </select>
                <input
                  value={localNumber}
                  onChange={(e)=>setLocalNumber(e.target.value)}
                  placeholder="98XXXXXXXX"
                  inputMode="numeric"
                  className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <div className="text-xs opacity-70 mt-1">Will send OTP to <code>{e164 || `+${country.dial}…`}</code></div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {channel==='phone' && phase==='verify' && (
          <form onSubmit={(e)=>{ e.preventDefault(); verifyPhoneOtp(); }} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Enter 6-digit code</label>
              <input
                value={otp}
                onChange={(e)=>setOtp(e.target.value)}
                placeholder="••••••"
                inputMode="numeric"
                className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify & Start Onboarding'}
            </button>
          </form>
        )}

        {/* EMAIL FLOW */}
        {channel==='email' && phase==='auth' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Email</label>
              <input
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
              />
            </div>
            <button onClick={sendEmailMagicLink} disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
            <p className="text-xs text-slate-400">
              After tapping the link, you’ll return here and onboarding opens automatically.
            </p>
          </div>
        )}

        {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
        {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      </section>
    </main>
  );
}
