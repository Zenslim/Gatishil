// app/join/page.tsx — Integrated (Tailwind) 
// Email Magic Link + Phone OTP (AakashSMS via /api/otp) + Google/Facebook OAuth
// After first proof → /security (not /members). If already signed-in → /dashboard.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Step = 'collect' | 'verify' | 'done';
type Channel = 'phone' | 'email';

type Country = { code: string; dial: string; name: string; flag: string };

const COUNTRIES: Country[] = [
  { code: 'NP', dial: '977', name: 'Nepal', flag: '🇳🇵' },
  { code: 'IN', dial: '91',  name: 'India', flag: '🇮🇳' },
  { code: 'BD', dial: '880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BT', dial: '975', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'PK', dial: '92',  name: 'Pakistan', flag: '🇵🇰' },
  { code: 'LK', dial: '94',  name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'CN', dial: '86',  name: 'China', flag: '🇨🇳' },
  { code: 'US', dial: '1',   name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dial: '44',  name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', dial: '61',  name: 'Australia', flag: '🇦🇺' },
];

/** Safely parse JSON from a real Response; falls back to text if not JSON. */
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return {}; }
  }
  const txt = await res.text().catch(() => '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

function showHttpError(res: Response, data: any): string {
  const msg = (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
  return `Server error: ${msg}`;
}

export default function JoinPage() {
  const router = useRouter();

  // auth short-circuit
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
    })();
  }, [router]);

  // Flow state
  const [step, setStep] = useState<Step>('collect');
  const [channel, setChannel] = useState<Channel>('phone');

  // Minimal profile (captured early to enrich account later)
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // Phone OTP
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [otp, setOtp] = useState('');

  // Email
  const [email, setEmail] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // ------ PHONE via custom /api/otp/send ------
  async function sendPhoneOtp() {
    resetAlerts();
    if (!e164 || !/^\+\d{8,15}$/.test(e164)) {
      setErr('Please enter a valid phone. Choose country, then type your number.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setErr(showHttpError(res, data)); return; }
      if (!data?.ok) { setErr(data?.error || 'Failed to send OTP'); return; }
      if (data.warn) setMsg(`Note: ${data.warn}`);
      setStep('verify');
      setMsg('We sent a 6-digit code by SMS. Enter it below.');
    } catch (e: any) {
      setErr(e?.message || 'Network error while sending OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    resetAlerts();
    if (!/^\d{6}$/.test((otp || '').trim())) {
      setErr('Enter the 6-digit code'); return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, code: otp.trim(), name, role }),
      });
      const data = await safeJson(res);
      if (!res.ok) { setErr(showHttpError(res, data)); return; }
      if (!data?.ok) { setErr(data?.error || 'Invalid code'); return; }

      // ✅ After OTP success → go set password once
      window.location.href = '/security';
      return;
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
    } finally {
      setLoading(false);
    }
  }

  // ------ EMAIL (Supabase magic) ------
  async function sendEmailMagicLink() {
    resetAlerts();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) {
      setErr('Enter a valid email address'); return;
    }
    setLoading(true);
    try {
      const redirectTo =
        `${window.location.origin}/security?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) { setErr(error.message); return; }
      setStep('done');
      setMsg('Check your email for the magic link.');
    } finally {
      setLoading(false);
    }
  }

  // ------ OAuth (Google/Facebook) ------
  async function signInWithProvider(provider: 'google' | 'facebook') {
    resetAlerts();
    setLoading(true);
    try {
      const redirectTo =
        `${window.location.origin}/security?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) { setErr(error.message); }
      // success will redirect
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh p-6 md:p-10 text-white bg-gradient-to-b from-slate-900 to-black">
      <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300/80">GatishilNepal.org</p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2">Join the Movement</h1>
        <p className="text-slate-300/90 mt-2">
          Use phone OTP, Google/Facebook, or email magic link. After first proof, you’ll set a password in 
          <strong> Security</strong>. Next time, just sign in with password — your device can unlock saved passwords with biometrics.
        </p>

        {/* Profile prefill */}
        <div className="grid grid-cols-1 gap-3 mt-5">
          <div>
            <label className="block text-xs text-slate-300/70 mb-1">Your Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Sushila Tamang"
              className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-xs text-slate-300/70 mb-1">How will you help? (Role)</label>
            <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g., Organizer, Farmer, Volunteer"
              className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-2 text-sm">
          <button onClick={()=>{setChannel('phone'); setErr(null); setMsg(null);}} 
                  className={'px-3 py-2 rounded-xl border ' + (channel==='phone'?'bg-white text-black':'border-white/15')}>
            📱 Phone
          </button>
          <button onClick={()=>{setChannel('email'); setErr(null); setMsg(null);}} 
                  className={'px-3 py-2 rounded-xl border ' + (channel==='email'?'bg-white text-black':'border-white/15')}>
            ✉️ Email
          </button>
        </div>

        {/* PHONE FLOW */}
        {channel==='phone' && (
          <div className="mt-4">
            {step==='collect' && (
              <form onSubmit={(e)=>{e.preventDefault(); sendPhoneOtp();}} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-1">Phone</label>
                  <div className="flex gap-2">
                    <select
                      value={country.code}
                      onChange={(e)=>{
                        const next = COUNTRIES.find(c=>c.code===e.target.value) || COUNTRIES[0];
                        setCountry(next);
                      }}
                      className="rounded-xl bg-transparent border border-white/15 px-3 py-2"
                      >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-slate-900">{c.flag} {c.name} (+{c.dial})</option>
                      ))}
                    </select>
                    <input
                      value={localNumber}
                      onChange={e=>setLocalNumber(e.target.value)}
                      placeholder="98XXXXXXXX"
                      inputMode="numeric"
                      className="flex-1 rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="text-xs opacity-70 mt-1">OTP will go to <code>{e164 || `+${country.dial}…`}</code></div>
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            )}

            {step==='verify' && (
              <form onSubmit={(e)=>{e.preventDefault(); verifyPhoneOtp();}} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-1">Enter 6-digit code</label>
                  <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="••••••" inputMode="numeric"
                    className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
                  {loading ? 'Verifying…' : 'Verify & Secure Account'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* EMAIL FLOW + OAUTH */}
        {channel==='email' && step!=='done' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-300/70 mb-1">Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
            </div>
            <button onClick={sendEmailMagicLink} disabled={loading} className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>

            <div className="text-center text-xs opacity-70">or</div>

            <div className="grid gap-2">
              <button onClick={()=>signInWithProvider('google')} disabled={loading} className="w-full px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5">
                Continue with Google
              </button>
              <button onClick={()=>signInWithProvider('facebook')} disabled={loading} className="w-full px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5">
                Continue with Facebook
              </button>
            </div>
          </div>
        )}

        {step==='done' && (
          <div className="mt-4">
            {msg && <div className="mb-3 text-sm">{msg}</div>}
            <a href="/security" className="inline-block px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5">🔐 Open Security Setup</a>
          </div>
        )}

        {!!msg && step!=='done' && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
        {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      </section>
    </main>
  );
}
