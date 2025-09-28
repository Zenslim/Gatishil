// app/join/page.tsx — Gateway: OTP/Magic → Security → Dashboard
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Step = 'collect' | 'verify' | 'done';
type Channel = 'email' | 'phone';

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('collect');
  const [channel, setChannel] = useState<Channel>('email');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // If already signed in → dashboard
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
    })();
  }, [router]);

  async function send() {
    setErr(''); setMsg(''); setLoading(true);
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: identifier, options: { emailRedirectTo: window.location.origin + '/auth/callback' } });
        if (error) throw error;
        setMsg('Magic link sent. Check your email.');
        setStep('done');
      } else {
        // Placeholder for phone OTP: wire to your /api/otp/send if using SMS
        const res = await fetch('/api/otp/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ phone: identifier }) });
        if (!res.ok) throw new Error('Failed to send OTP');
        setMsg('SMS code sent. Enter the 6-digit code.');
        setStep('verify');
      }
    } catch (e:any) {
      setErr(e.message || 'Failed to send. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setErr(''); setMsg(''); setLoading(true);
    try {
      // Example local verify endpoint (expects {phone, code} and creates a session using Supabase Admin JWT)
      const res = await fetch('/api/otp/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ phone: identifier, code }) });
      if (!res.ok) throw new Error('Invalid code');
      setMsg('Verified. Redirecting to Security…');
      router.replace('/security');
    } catch (e:any) {
      setErr(e.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh p-6 md:p-10 text-white bg-gradient-to-b from-slate-900 to-black">
      <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300/80">GatishilNepal.org</p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2">Join the Movement</h1>
        <p className="text-slate-300/90 mt-2">Use email magic link or SMS OTP. After first proof, you’ll set a password in <strong>Security</strong>. Next time, just sign in with password (your device can unlock saved passwords by biometrics).</p>

        {/* channel toggle */}
        <div className="mt-5 flex gap-2 text-sm">
          <button onClick={()=>setChannel('email')} className={"px-3 py-2 rounded-xl border " + (channel==='email'?'bg-white text-black':'border-white/15')}>Email</button>
          <button onClick={()=>setChannel('phone')} className={"px-3 py-2 rounded-xl border " + (channel==='phone'?'bg-white text-black':'border-white/15')}>Phone</button>
        </div>

        {step === 'collect' && (
          <div className="mt-4 space-y-3">
            <input value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder={channel==='email'?'you@example.com':'+97798…'} className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
            <button onClick={send} disabled={loading || !identifier} className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">{loading?'Sending…':'Continue'}</button>
          </div>
        )}

        {step === 'verify' && channel==='phone' && (
          <div className="mt-4 space-y-3">
            <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="6-digit code" className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400" />
            <button onClick={verify} disabled={loading || code.length<4} className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60">{loading?'Verifying…':'Verify & Continue'}</button>
          </div>
        )}

        {step === 'done' && (
          <div className="mt-4 text-sm text-slate-300/90">
            Magic link sent. Open your email and tap the link to finish. After redirect you can set a password in <strong>Security</strong>.
          </div>
        )}

        {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
        {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
      </section>
    </main>
  );
}
