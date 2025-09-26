// app/join/page.tsx — Phone‑first OTP with email fallback (Supabase Auth)
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Step = 'collect' | 'verify' | 'done';

export default function JoinPage() {
  const [step, setStep] = useState<Step>('collect');
  const [name, setName] = useState('');
  const [role, setRole] = useState(''); // occupation / how you help
  const [phone, setPhone] = useState(''); // e.g., +97798XXXXXXXX
  const [email, setEmail] = useState(''); // fallback
  const [channel, setChannel] = useState<'phone'|'email'>('phone');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetAlerts = () => { setMsg(null); setErr(null); };

  async function handleSend() {
    resetAlerts();
    setLoading(true);
    try {
      if (channel === 'phone') {
        if (!/^\+\d{10,15}$/.test(phone.trim())) {
          setErr('Please enter a valid phone like +97798XXXXXXXX'); return;
        }
        const { error } = await supabaseBrowser.auth.signInWithOtp({
          phone: phone.trim(),
          options: { channel: 'sms', shouldCreateUser: true },
        });
        if (error) {
          // If SMS not configured, guide user to email fallback
          if (String(error.message || '').toLowerCase().includes('sms')) {
            setChannel('email');
            setMsg('SMS not available. Switched to Email sign-in automatically.');
          } else {
            setErr(error.message);
            return;
          }
        } else {
          setStep('verify');
          setMsg('We sent a 6‑digit code by SMS. Enter it below.');
        }
      }

      if (channel === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setErr('Enter a valid email address'); return;
        }
        const redirectTo = `${window.location.origin}/auth/callback?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
        const { error } = await supabaseBrowser.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
        });
        if (error) { setErr(error.message); return; }
        setStep('done');
        setMsg('Check your email for the sign‑in link.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    resetAlerts();
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser.auth.verifyOtp({
        phone: phone.trim(),
        token: code.trim(),
        type: 'sms',
      });
      if (error) { setErr(error.message); return; }
      // Signed in — write to people table (idempotent on phone or email)
      const user = data.user;
      const payload: any = {
        name: name || user?.user_metadata?.full_name || phone || email,
        role: role || null,
        phone: phone || null,
        email: user?.email || null,
        created_by: user?.id || null,
      };
      // Upsert by unique email/phone using on_conflict via RPC is not available on client;
      // we rely on unique constraints + ignore duplicate errors.
      const { error: insertErr } = await supabaseBrowser.from('people').insert([payload]);
      if (insertErr && !String(insertErr.message).toLowerCase().includes('duplicate')) {
        console.warn('people.insert', insertErr.message);
      }
      setStep('done');
      setMsg('🎉 Welcome! You can now enter.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { resetAlerts(); }, [channel]);

  return (
    <div style={{minHeight:'100dvh', display:'grid', placeItems:'center', background:'#0b1020', color:'#e6f0ff', padding:'24px'}}>
      <div style={{width:'100%', maxWidth:520, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:20, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
        <h1 style={{fontSize:28, fontWeight:800, marginBottom:6}}>Join Gatishil</h1>
        <p style={{opacity:.8, marginBottom:16}}>Phone‑first (SMS OTP). Email is available as fallback.</p>

        {/* Channel switcher */}
        <div style={{display:'flex', gap:8, marginBottom:16}}>
          <button onClick={()=>setChannel('phone')} disabled={channel==='phone'} style={tabStyle(channel==='phone')}>📱 Phone</button>
          <button onClick={()=>setChannel('email')} disabled={channel==='email'} style={tabStyle(channel==='email')}>✉️ Email</button>
        </div>

        {/* Step: collect */}
        {step==='collect' && (
          <form onSubmit={(e)=>{e.preventDefault(); handleSend();}}>
            <label style={labelStyle}>Your Name</label>
            <input style={inputStyle} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Mritunjaya Shrestha" required />

            <label style={labelStyle}>How will you help? (Role)</label>
            <input style={inputStyle} value={role} onChange={(e)=>setRole(e.target.value)} placeholder="e.g., Organizer, Farmer, Teacher" />

            {channel==='phone' ? (
              <>
                <label style={labelStyle}>Phone (with country code)</label>
                <input style={inputStyle} value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+97798XXXXXXXX" />
              </>
            ) : (
              <>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
              </>
            )}

            <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading?'Sending…':'Send code/link'}</button>
          </form>
        )}

        {/* Step: verify (phone) */}
        {step==='verify' && channel==='phone' && (
          <form onSubmit={(e)=>{e.preventDefault(); handleVerifyOtp();}}>
            <label style={labelStyle}>Enter 6‑digit code</label>
            <input style={inputStyle} value={code} onChange={(e)=>setCode(e.target.value)} placeholder="••••••" />
            <button type="submit" disabled={loading} style={primaryBtnStyle}>{loading?'Verifying…':'Verify & Enter'}</button>
          </form>
        )}

        {/* Done */}
        {step==='done' && (
          <div>
            <div style={{margin:'12px 0'}}>{msg}</div>
            <a href="/members" style={{display:'inline-block', textDecoration:'none', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)'}}>🚀 Go to Members</a>
          </div>
        )}

        {/* Alerts */}
        {msg && <div style={{marginTop:10, fontSize:14, opacity:.9}}>{msg}</div>}
        {err && <div style={{marginTop:10, fontSize:14, color:'#ffb4b4'}}>Error: {err}</div>}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display:'block', margin:'12px 4px 6px', opacity:.8, fontSize:13 };
const inputStyle: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#e6f0ff' };
const primaryBtnStyle: React.CSSProperties = { marginTop:12, width:'100%', padding:'12px', borderRadius:12, background:'#2563eb', color:'white', border:'none', fontWeight:700 };
function tabStyle(active: boolean): React.CSSProperties {
  return { flex:1, padding:'8px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(37,99,235,0.2)' : 'transparent', color:'#e6f0ff' };
}
