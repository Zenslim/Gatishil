// app/join/page.tsx — Join → OnboardingFlow (polished to match homepage)
// Stack: Next.js App Router + Supabase + Vercel
'use client';

import CountryPicker from '@/app/components/CountryPicker';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';
import type { CountryDial } from '@/app/data/countries';
import { COUNTRIES } from '@/app/data/countries';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Phase = 'auth' | 'verify' | 'onboarding';
type Channel = 'phone' | 'email';

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh grid place-items-center bg-black text-slate-300">
        <div className="text-sm opacity-80">Loading…</div>
      </main>
    }>
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [phase, setPhase] = useState<Phase>('auth');
  const [channel, setChannel] = useState<Channel>('phone');

  // Country + phone
  const [country, setCountry] = useState<CountryDial>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // OTP + Email
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  // Prefill (optional)
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [showPersonalize, setShowPersonalize] = useState(false);

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  // Fast-path
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const wantsOnboarding = params.get('onboarding') === '1';
      if (session && wantsOnboarding) { setPhase('onboarding'); return; }
      if (session && !wantsOnboarding) { router.replace('/dashboard'); return; }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers
  async function safeJson(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) { try { return await res.json(); } catch { return {}; } }
    const txt = await res.text().catch(() => ''); try { return JSON.parse(txt); } catch { return { raw: txt }; }
  }
  function httpErr(res: Response, data: any) {
    return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
  }

  // PHONE OTP — send/verify
  async function sendPhoneOtp() {
    resetAlerts();
    if (!/^\+\d{8,15}$/.test(e164)) { setErr('Please enter a valid phone number.'); return; }
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

  // EMAIL — magic link back to /join?onboarding=1
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
      setMsg('Check your inbox and tap the magic link to continue here.');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending magic link');
    } finally { setLoading(false); }
  }

  // Onboarding in-page
  if (phase === 'onboarding') return <OnboardingFlow />;

  // ---------------- UI ----------------
  return (
    <main className="min-h-dvh bg-black text-white">
      {/* Hero, aligned to homepage style */}
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
          {/* Personalize (optional) — collapsed by default */}
          <button
            type="button"
            onClick={() => setShowPersonalize(v => !v)}
            className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            aria-expanded={showPersonalize ? 'true' : 'false'}
          >
            <span className="text-slate-200">✨ Personalize (optional)</span>
            <span className="text-slate-400">{showPersonalize ? 'Hide' : 'Add'}</span>
          </button>

          {showPersonalize && (
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e)=>setName(e.target.value)}
                  placeholder="e.g., Sushila Tamang"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">How will you help? (Role)</label>
                <input
                  value={role}
                  onChange={(e)=>setRole(e.target.value)}
                  placeholder="e.g., Organizer, Farmer, Volunteer"
                  className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                This only shapes your welcome and recommendations. Skip anytime — you can set it later.
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-5 flex gap-2 text-sm">
            <button
              onClick={()=>{ setChannel('phone'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel==='phone'?'bg-white text-black':'border-white/15 hover:bg-white/5')}
            >
              Phone
            </button>
            <button
              onClick={()=>{ setChannel('email'); resetAlerts(); setPhase('auth'); }}
              className={'px-3 py-2 rounded-full border transition ' + (channel==='email'?'bg-white text-black':'border-white/15 hover:bg-white/5')}
            >
              E-mail
            </button>
          </div>

          {/* PHONE FLOW */}
          {channel==='phone' && phase==='auth' && (
            <form onSubmit={(e)=>{ e.preventDefault(); sendPhoneOtp(); }} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-1">Phone</label>
               <div className="flex gap-2">
  {/* Flag + dial button (opens modal) */}
  <button
    type="button"
    onClick={() => setPickerOpen(true)}
    className="min-w-[110px] flex items-center justify-between rounded-xl bg-transparent border border-white/15 px-3 py-2"
    aria-haspopup="dialog"
    aria-expanded={pickerOpen ? 'true' : 'false'}
  >
    <span className="flex items-center gap-2">
      <span className="text-xl">{country.flag}</span>
      <span className="text-slate-200">+{country.dial}</span>
    </span>
    <span className="opacity-60">▾</span>
  </button>

  <input
    value={localNumber}
    onChange={(e)=>setLocalNumber(e.target.value)}
    placeholder="98XXXXXXXX"
    inputMode="numeric"
    className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
  />
</div>

{/* Modal */}
<CountryPicker
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  value={country}
  onChange={(c) => setCountry(c)}
/>
                </div>
                <div className="text-xs opacity-70 mt-1">Will send OTP to <code>{e164 || `+${country.dial}…`}</code></div>
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
    </main>
  );
}
