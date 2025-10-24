'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getFriendlySupabaseEmailError } from '@/lib/auth/emailErrorHints';

type Tab = 'phone' | 'email';

// Valid final form (what Supabase needs)
const NEPAL_E164 = /^\+9779[78]\d{8}$/;
// Raw 10-digit local Nepal mobile like 98XXXXXXXX or 97XXXXXXXX
const NEPAL_LOCAL_10 = /^9[78]\d{8}$/;

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Normalize anything the user types to E.164 (+977…) or return null if invalid
function normalizeNepalPhone(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');
  if (NEPAL_E164.test(s)) return s;
  const digits = s.replace(/\D/g, '');
  if (NEPAL_LOCAL_10.test(digits)) return `+977${digits}`;
  return null;
}

function JoinClientBody() {
  const router = useRouter();

  // Tabs & alerts
  const [tab, setTab] = useState<Tab>('phone');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetAlerts = () => {
    setMessage(null);
    setError(null);
  };

  // Session guard → if already signed in, go to onboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/onboard?src=join');
    })();
  }, [router]);

  // Countdown timer tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- PHONE lane ----
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneCodeRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState('');
  const [phoneSentTo, setPhoneSentTo] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneResendAt, setPhoneResendAt] = useState<number | null>(null);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  const phoneCountdown = useMemo(() => {
    if (!phoneResendAt) return 0;
    return Math.max(0, Math.ceil((phoneResendAt - now) / 1000));
  }, [phoneResendAt, now]);

  async function sendPhoneOtp() {
    if (phoneSending || phoneCountdown > 0) return;
    resetAlerts();

    const normalized = normalizeNepalPhone(phone);
    if (!normalized) {
      setError('Phone OTP is Nepal-only. Enter 97/98 number (e.g., 98XXXXXXXX) or +97798…');
      phoneInputRef.current?.focus();
      return;
    }

    setPhoneSending(true);
    try {
      const res = await fetch('/api/otp/phone/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: normalized }),
      });
      const payload: any = await res.json().catch(() => null);
      if (!res.ok || payload?.error) {
        throw new Error(payload?.detail || payload?.error || 'Could not send SMS OTP.');
      }
      setPhoneSentTo(normalized);
      setPhoneCode('');
      setMessage('We sent a 6-digit code (expires in 5 minutes).');
      setPhoneResendAt(Date.now() + 30_000); // UI throttle to 30s (align with server)
      setTimeout(() => phoneCodeRef.current?.focus(), 50);
    } catch (e: any) {
      setError(e?.message || 'Could not send SMS OTP.');
    } finally {
      setPhoneSending(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!phoneSentTo || phoneCode.length !== 6 || phoneVerifying) return;
    resetAlerts();
    setPhoneVerifying(true);
    try {
      const res = await fetch('/api/otp/phone/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: phoneSentTo, token: phoneCode }),
      });
      const payload: any = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.detail || payload?.error || 'Invalid or expired code.');
      }

      const session = payload?.session;
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } else {
        await supabase.auth.getSession();
      }

      router.replace('/onboard?src=join');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired code.');
    } finally {
      setPhoneVerifying(false);
    }
  }

  // ---- EMAIL lane ----
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailCodeRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailResendAt, setEmailResendAt] = useState<number | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const emailCountdown = useMemo(() => {
    if (!emailResendAt) return 0;
    return Math.max(0, Math.ceil((emailResendAt - now) / 1000));
  }, [emailResendAt, now]);

  async function sendEmailOtp() {
    if (emailSending || emailCountdown > 0) return;
    resetAlerts();
    const addr = email.trim().toLowerCase();
    if (!isEmail(addr)) {
      setError('Enter a valid email.');
      emailInputRef.current?.focus();
      return;
    }
    setEmailSending(true);
    try {
      const redirectBase =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'https://www.gatishilnepal.org';
      const emailRedirectTo = `${redirectBase}/onboard?src=join`;

      const res = await fetch('/api/otp/email/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: addr, type: 'otp', redirectTo: emailRedirectTo }),
      });
      const payload: any = await res.json().catch(() => null);
      if (!res.ok || payload?.error) {
        const detail = payload?.detail || payload?.error;
        const friendly = detail ? getFriendlySupabaseEmailError({ message: detail } as any) : null;
        if (friendly) {
          throw new Error(friendly);
        }
        throw new Error(detail || 'Could not send email OTP.');
      }
      setEmailSentTo(addr);
      setEmailCode('');
      setMessage('We sent a 6-digit code (expires in 5 minutes).');
      setEmailResendAt(Date.now() + 30_000);
      setTimeout(() => emailCodeRef.current?.focus(), 50);
    } catch (e: any) {
      const friendly = getFriendlySupabaseEmailError(e);
      if (friendly && friendly !== e?.message) {
        setError(friendly);
      } else {
        setError(e?.message || 'Could not send email OTP.');
      }
    } finally {
      setEmailSending(false);
    }
  }

  async function verifyEmailOtp() {
    if (!emailSentTo || emailCode.length !== 6 || emailVerifying) return;
    resetAlerts();
    setEmailVerifying(true);
    try {
      const res = await fetch('/api/otp/email/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailSentTo, token: emailCode }),
      });
      const payload: any = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        const msg = payload?.detail || payload?.error || 'Invalid or expired code.';
        const friendly = getFriendlySupabaseEmailError({ message: msg } as any);
        if (friendly) throw new Error(friendly);
        throw new Error(msg);
      }

      const session = payload?.session;
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } else {
        await supabase.auth.getSession();
      }

      router.replace('/onboard?src=join');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Invalid or expired code.');
    } finally {
      setEmailVerifying(false);
    }
  }

  // ---- classic visible inputs (force readable text) ----
  const inputClass =
    'mt-1 w-full rounded-xl border border-white/20 bg-white text-black ' +
    'placeholder-gray-500 caret-black px-3 py-2 outline-none ' +
    'focus:ring-2 focus:ring-sky-400 focus:border-sky-400';
  const codeInputClass =
    'w-full rounded-xl border border-white/20 bg-white text-black text-center tracking-[0.4em] ' +
    'placeholder-gray-400 caret-black px-3 py-2 outline-none ' +
    'focus:ring-2 focus:ring-sky-400 focus:border-sky-400';

  const tabBtn = (active: boolean) =>
    'flex-1 px-4 py-2 rounded-lg text-sm font-semibold ' +
    (active ? 'bg-white text-black' : 'text-slate-300');

  const actionBtn = (tone: 'blue' | 'green', disabled: boolean) =>
    `w-full px-4 py-3 rounded-2xl font-semibold text-white ${
      tone === 'blue' ? 'bg-blue-600' : 'bg-green-600'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'}`;

  return (
    <main className="min-h-dvh bg-black text-white">
      {/* ===== Welcome header (restored) ===== */}
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the DAO Party
          <br className="hidden md:block" /> of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Choose <b>Phone OTP</b> or <b>Email OTP</b>. Once verified, we’ll take you to onboarding.
        </p>
      </header>

      {/* ===== Card with tabs ===== */}
      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          <div className="flex gap-2 rounded-xl bg-white/5 p-1 mb-6">
            <button
              onClick={() => {
                setTab('phone');
                resetAlerts();
              }}
              className={tabBtn(tab === 'phone')}
            >
              Phone OTP
            </button>
            <button
              onClick={() => {
                setTab('email');
                resetAlerts();
              }}
              className={tabBtn(tab === 'email')}
            >
              Email OTP
            </button>
          </div>

          {tab === 'phone' && (
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">
                🇳🇵 Nepal-only — enter <b>98XXXXXXXX</b> or <b>+97798XXXXXXXX</b>
              </label>
              <input
                ref={phoneInputRef}
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className={inputClass}
                aria-label="Phone number"
              />
              {!phoneSentTo ? (
                <button
                  onClick={sendPhoneOtp}
                  disabled={phoneSending || phoneCountdown > 0 || !phone.trim()}
                  className={actionBtn('blue', phoneSending || phoneCountdown > 0 || !phone.trim()) + ' mt-4'}
                >
                  {phoneSending ? 'Sending…' : phoneCountdown > 0 ? `Resend in ${phoneCountdown}s` : 'Send SMS'}
                </button>
              ) : (
                <div className="mt-4">
                  <label className="block text-xs text-slate-300/70 mb-1">
                    Enter 6-digit code sent to <b>{phoneSentTo}</b>
                  </label>
                  <input
                    ref={phoneCodeRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted) {
                        e.preventDefault();
                        setPhoneCode(pasted);
                      }
                    }}
                    placeholder="123456"
                    className={codeInputClass}
                    aria-label="Phone one-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyPhoneOtp}
                      disabled={phoneVerifying || phoneCode.length !== 6}
                      className={actionBtn('green', phoneVerifying || phoneCode.length !== 6)}
                    >
                      {phoneVerifying ? 'Verifying…' : 'Verify & Continue'}
                    </button>
                    <button
                      onClick={() => {
                        setPhoneSentTo(null);
                        setPhoneCode('');
                        setMessage(null);
                        setError(null);
                        setPhoneResendAt(null);
                        phoneInputRef.current?.focus();
                      }}
                      className="px-4 py-3 rounded-2xl border border-white/15"
                    >
                      Change number
                    </button>
                  </div>
                  {phoneCountdown > 0 && (
                    <p className="mt-3 text-xs text-slate-400">Resend available in {phoneCountdown}s.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'email' && (
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">Email</label>
              {!emailSentTo ? (
                <>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                    aria-label="Email address"
                  />
                  <button
                    onClick={sendEmailOtp}
                    disabled={emailSending || emailCountdown > 0 || !email.trim()}
                    className={actionBtn('blue', emailSending || emailCountdown > 0 || !email.trim()) + ' mt-4'}
                  >
                    {emailSending ? 'Sending…' : emailCountdown > 0 ? `Resend in ${emailCountdown}s` : 'Send 6-digit code'}
                  </button>
                </>
              ) : (
                <div className="mt-1">
                  <label className="block text-xs text-slate-300/70 mb-1">
                    Enter 6-digit code sent to <b>{emailSentTo}</b>
                  </label>
                  <input
                    ref={emailCodeRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted) {
                        e.preventDefault();
                        setEmailCode(pasted);
                      }
                    }}
                    placeholder="123456"
                    className={codeInputClass}
                    aria-label="Email one-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyEmailOtp}
                      disabled={emailVerifying || emailCode.length !== 6}
                      className={actionBtn('green', emailVerifying || emailCode.length !== 6)}
                    >
                      {emailVerifying ? 'Verifying…' : 'Verify & Continue'}
                    </button>
                    <button
                      onClick={() => {
                        setEmailSentTo(null);
                        setEmailCode('');
                        setMessage(null);
                        setError(null);
                        setEmailResendAt(null);
                        emailInputRef.current?.focus();
                      }}
                      className="px-4 py-3 rounded-2xl border border-white/15"
                    >
                      Change email
                    </button>
                  </div>
                  {emailCountdown > 0 && (
                    <p className="mt-3 text-xs text-slate-400">Resend available in {emailCountdown}s.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {message && <p className="mt-4 text-xs text-emerald-300">{message}</p>}
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </div>
      </section>
    </main>
  );
}

export default function JoinClient() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-black" />}>
      <JoinClientBody />
    </Suspense>
  );
}
