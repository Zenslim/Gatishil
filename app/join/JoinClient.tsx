'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { normalizeNepalMobile } from '@/lib/auth/phone';
import { verifyOtpAndSync } from '@/lib/auth/verifyOtpClient';

function JoinClientBody() {
  const router = useRouter();

  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/onboard?src=join');
      }
    })();
  }, [router]);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneCodeRef = useRef<HTMLInputElement>(null);
  const emailCodeRef = useRef<HTMLInputElement>(null);

  const [phoneRaw, setPhoneRaw] = useState('');
  const [phoneSentTo, setPhoneSentTo] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneResendAt, setPhoneResendAt] = useState<number | null>(null);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  const [email, setEmail] = useState('');
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailResendAt, setEmailResendAt] = useState<number | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const phoneCountdown = useMemo(() => {
    if (!phoneResendAt) return 0;
    return Math.max(0, Math.ceil((phoneResendAt - now) / 1000));
  }, [phoneResendAt, now]);

  const emailCountdown = useMemo(() => {
    if (!emailResendAt) return 0;
    return Math.max(0, Math.ceil((emailResendAt - now) / 1000));
  }, [emailResendAt, now]);

  function resetAlerts() {
    setMessage(null);
    setError(null);
  }

  async function sendPhoneOtp() {
    if (phoneSending || phoneCountdown > 0) return;
    resetAlerts();
    const normalized = normalizeNepalMobile(phoneRaw);
    if (!normalized) {
      setError('Phone OTP is Nepal-only. Enter 96/97/98… (or +9779…) or use email.');
      return;
    }

    setPhoneSending(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        throw new Error(data?.message || 'Could not send SMS OTP.');
      }
      setPhoneSentTo(normalized);
      setPhoneCode('');
      setMessage('We sent a 6-digit code (expires in 5 minutes).');
      setPhoneResendAt(Date.now() + 60_000);
      setTimeout(() => phoneCodeRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err?.message || 'Could not send SMS OTP.');
    } finally {
      setPhoneSending(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!phoneSentTo || phoneCode.length !== 6 || phoneVerifying) return;
    resetAlerts();
    setPhoneVerifying(true);
    try {
      const result = await verifyOtpAndSync({ phone: phoneSentTo, code: phoneCode });
      const next = typeof result?.next === 'string' ? result.next : '/onboard?src=join';
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code.');
    } finally {
      setPhoneVerifying(false);
    }
  }

  async function sendEmailOtp() {
    if (emailSending || emailCountdown > 0) return;
    resetAlerts();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter a valid email.');
      emailInputRef.current?.focus();
      return;
    }
    setEmailSending(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        throw new Error(data?.message || 'Could not send email OTP.');
      }
      setEmailSentTo(trimmed);
      setEmailCode('');
      setMessage('We sent a 6-digit code (expires in 5 minutes).');
      setEmailResendAt(Date.now() + 60_000);
      setTimeout(() => emailCodeRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err?.message || 'Could not send email OTP.');
    } finally {
      setEmailSending(false);
    }
  }

  async function verifyEmailOtp() {
    if (!emailSentTo || emailCode.length !== 6 || emailVerifying) return;
    resetAlerts();
    setEmailVerifying(true);
    try {
      const result = await verifyOtpAndSync({ email: emailSentTo, code: emailCode });
      const next = typeof result?.next === 'string' ? result.next : '/onboard?src=join';
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code.');
    } finally {
      setEmailVerifying(false);
    }
  }

  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the DAO Party<br className="hidden md:block" /> of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Choose <b>Phone OTP</b> or <b>Email OTP</b>. Once verified, we’ll take you to onboarding.
        </p>
      </header>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          <div className="flex gap-2 rounded-xl bg-white/5 p-1 mb-6">
            <button
              onClick={() => { setTab('phone'); resetAlerts(); }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'phone' ? 'bg-white text-black' : 'text-slate-300'}`}
            >
              Phone OTP
            </button>
            <button
              onClick={() => { setTab('email'); resetAlerts(); }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'email' ? 'bg-white text-black' : 'text-slate-300'}`}
            >
              Email OTP
            </button>
          </div>

          {tab === 'phone' && (
            <div>
              <label className="block text-xs text-slate-300/70 mb-2">🇳🇵 +977 — SMS works for Nepali numbers only</label>
              <input
                ref={phoneInputRef}
                inputMode="tel"
                autoComplete="tel"
                value={phoneRaw}
                onChange={(e) => setPhoneRaw(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
                aria-label="Phone number"
              />

              {!phoneSentTo ? (
                <button
                  onClick={sendPhoneOtp}
                  disabled={phoneSending || phoneCountdown > 0 || !phoneRaw.trim()}
                  className="mt-4 w-full px-4 py-3 rounded-2xl bg-emerald-400 text-black font-semibold disabled:opacity-60"
                >
                  {phoneSending ? 'Sending…' : phoneCountdown > 0 ? `Resend in ${phoneCountdown}s` : 'Send OTP'}
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
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPhoneCode(digits);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted) {
                        e.preventDefault();
                        setPhoneCode(pasted);
                      }
                    }}
                    placeholder="______"
                    className="w-full rounded-xl bg-white text-black dark:bg-neutral-900 dark:text-white border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="Phone one-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyPhoneOtp}
                      disabled={phoneVerifying || phoneCode.length !== 6}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
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
                    className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
                    aria-label="Email address"
                  />
                  <button
                    onClick={sendEmailOtp}
                    disabled={emailSending || emailCountdown > 0 || !email.trim()}
                    className="mt-4 w-full px-4 py-3 rounded-2xl bg-amber-400 text-black font-semibold disabled:opacity-60"
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
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setEmailCode(digits);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (pasted) {
                        e.preventDefault();
                        setEmailCode(pasted);
                      }
                    }}
                    placeholder="______"
                    className="w-full rounded-xl bg-white text-black dark:bg-neutral-900 dark:text-white border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                    aria-label="Email one-time code"
                    maxLength={6}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={verifyEmailOtp}
                      disabled={emailVerifying || emailCode.length !== 6}
                      className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
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
