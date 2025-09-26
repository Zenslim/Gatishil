// app/join/page.tsx — Type-safe: AakashSMS OTP + Email Magic Link + Google/Facebook
// Direct after-OTP target: /security (not /members)

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

  // Flow
  const [step, setStep] = useState<Step>('collect');
  const [channel, setChannel] = useState<Channel>('phone');

  // Minimal profile
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('');

  // Phone (AakashSMS)
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');

  // Email (Supabase)
  const [email, setEmail] = useState<string>('');

  // UI
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resetAlerts = () => { setMsg(null); setErr(null); };

  // E.164 for validation/display
  const e164 = useMemo(() => {
    const digits = (localNumber || '').replace(/\D/g, '');
    return digits ? `+${country.dial}${digits}` : '';
  }, [country, localNumber]);

  // ---------- PHONE via AakashSMS (custom API) ----------
  async function sendPhoneOtp() {
    resetAlerts();
    if (!e164 || !/^\+\d{8,15}$/.test(e164)) {
      setErr('Please enter a valid phone. Choose country, then type your number.');
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

      // ✅ DIRECT: After OTP success, go to /security (not /members)
      window.location.href = '/security';
      return;
    } catch (e: any) {
      setErr(e?.message || 'Network error while verifying OTP');
    } finally {
      setLoading(false);
    }
  }

  // ---------- EMAIL via Supabase ----------
  async function sendEmailMagicLink() {
    resetAlerts();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) {
      setErr('Enter a valid email address'); return;
    }
    setLoading(true);
    try {
      // ✅ DIRECT: magic link lands on /security (carry optional profile info)
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

  // ---------- OAuth via Supabase ----------
  async function signInWithProvider(provider: 'google' | 'facebook') {
    resetAlerts();
    setLoading(true);
    try {
      // ✅ DIRECT: OAuth callback goes to /security too
      const redirectTo =
        `${window.location.origin}/security?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) { setErr(error.message); }
      // success → browser redirects
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { resetAlerts(); }, [channel]);

  return (
    <div style={screen}>
      <div style={card}>
        <h1 style={title}>Join Gatishil</h1>
        <p style={subtitle}>Phone (SMS OTP via AakashSMS) — or Email magic link — or Google/Facebook.</p>

        {/* Tabs */}
        <div style={tabs}>
          <button onClick={()=>setChannel('phone')} disabled={channel==='phone'} style={tab(channel==='phone')}>📱 Phone</button>
          <button onClick={()=>setChannel('email')} disabled={channel==='email'} style={tab(channel==='email')}>✉️ Email</button>
        </div>

        {/* Minimal profile */}
        <label style={label}>Your Name</label>
        <input style={input} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Sushila Tamang" />

        <label style={label}>How will you help? (Role)</label>
        <input style={input} value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g., Organizer, Farmer, Volunteer, Teacher" />

        {/* PHONE FLOW */}
        {channel === 'phone' && (
          <div>
            {step === 'collect' && (
              <form onSubmit={(e)=>{e.preventDefault(); sendPhoneOtp();}}>
                <label style={label}>Phone</label>
                <div style={{display:'flex', gap:8}}>
                  <select
                    value={country.code}
                    onChange={(e)=>{
                      const next = COUNTRIES.find(c=>c.code===e.target.value) || COUNTRIES[0];
                      setCountry(next);
                    }}
                    style={{...input, maxWidth:200}}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name} (+{c.dial})</option>
                    ))}
                  </select>
                  <input
                    style={{...input, flex:1}}
                    value={localNumber}
                    onChange={e=>setLocalNumber(e.target.value)}
                    placeholder="98XXXXXXXX"
                    inputMode="numeric"
                  />
                </div>
                <div style={{fontSize:12, opacity:.7, marginTop:6}}>
                  OTP will go to <code>{e164 || `+${country.dial}…`}</code>
                </div>
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={(e)=>{e.preventDefault(); verifyPhoneOtp();}}>
                <label style={label}>Enter 6-digit code</label>
                <input style={input} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="••••••" inputMode="numeric" />
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? 'Verifying…' : 'Verify & Secure Account'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* EMAIL FLOW */}
        {channel === 'email' && step !== 'done' && (
          <div>
            <label style={label}>Email</label>
            <input style={input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
            <button onClick={sendEmailMagicLink} disabled={loading} style={primaryBtn}>
              {loading ? 'Sending…' : 'Send Magic Link (→ /security)'}
            </button>

            <div style={{textAlign:'center', margin:'10px 0', opacity:.7}}>or</div>

            <div style={{display:'grid', gap:8}}>
              <button onClick={()=>signInWithProvider('google')} disabled={loading} style={oauthBtn}>
                Continue with Google (→ /security)
              </button>
              <button onClick={()=>signInWithProvider('facebook')} disabled={loading} style={oauthBtn}>
                Continue with Facebook (→ /security)
              </button>
            </div>
          </div>
        )}

        {/* DONE (email/OAuth only) */}
        {step === 'done' && (
          <div>
            {msg && <div style={{margin:'12px 0'}}>{msg}</div>}
            <a href="/security" style={linkBtn}>🔐 Open Security Setup</a>
          </div>
        )}

        {/* Alerts */}
        {msg && step!=='done' && <div style={{marginTop:10, fontSize:14, opacity:.9}}>{msg}</div>}
        {err && <div style={{marginTop:10, fontSize:14, color:'#ffb4b4'}}>Error: {err}</div>}
      </div>
    </div>
  );
}

/** Styles */
const screen: React.CSSProperties = { minHeight:'100dvh', display:'grid', placeItems:'center', background:'#0b1020', color:'#e6f0ff', padding:'24px' };
const card: React.CSSProperties = { width:'100%', maxWidth:520, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:20, boxShadow:'0 10px 30px rgba(0,0,0,0.4)' };
const title: React.CSSProperties = { fontSize:28, fontWeight:800, marginBottom:6 };
const subtitle: React.CSSProperties = { opacity:.8, marginBottom:16 };
const tabs: React.CSSProperties = { display:'flex', gap:8, marginBottom:16 };
const label: React.CSSProperties = { display:'block', margin:'12px 4px 6px', opacity:.8, fontSize:13 };
const input: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#e6f0ff' };
const primaryBtn: React.CSSProperties = { marginTop:12, width:'100%', padding:'12px', borderRadius:12, background:'#2563eb', color:'white', border:'none', fontWeight:800 };
const oauthBtn: React.CSSProperties = { width:'100%', padding:'11px 12px', borderRadius:12, background:'rgba(255,255,255,0.06)', color:'#e6f0ff', border:'1px solid rgba(255,255,255,0.12)', fontWeight:700, textAlign:'center' };
const linkBtn: React.CSSProperties = { display:'inline-block', textDecoration:'none', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', color:'#e6f0ff' };
function tab(active: boolean): React.CSSProperties {
  return { flex:1, padding:'8px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background: active ? 'rgba(37,99,235,0.2)' : 'transparent', color:'#e6f0ff' };
}
