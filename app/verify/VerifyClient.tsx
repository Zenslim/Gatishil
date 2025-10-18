'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { maskIdentifier } from '@/lib/auth/validate';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS, OTP_TTL_SECONDS } from '@/lib/constants/auth';

const SMS_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED === 'true';

type Channel = 'email' | 'phone';

export default function VerifyClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [identifier, setIdentifier] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [triesRemaining, setTriesRemaining] = useState(OTP_MAX_ATTEMPTS);
  const [resendIn, setResendIn] = useState(OTP_RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pendingId = sessionStorage.getItem('pending_id');
    const pendingChannel = sessionStorage.getItem('pending_channel') as Channel | null;
    setIdentifier(pendingId);
    setChannel(pendingChannel ?? (pendingId && pendingId.includes('@') ? 'email' : pendingId ? 'phone' : null));
    setCode('');
    setError(null);
    setTriesRemaining(OTP_MAX_ATTEMPTS);
    setResendIn(OTP_RESEND_SECONDS);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  async function verify(submittedCode?: string) {
    if (submittingRef.current) return;
    if (!identifier) {
      setError('No pending verification. Go back to Join.');
      return;
    }
    if (triesRemaining <= 0) {
      setError('Too many attempts. Please wait 2 minutes, then request a new code.');
      return;
    }
    const token = (submittedCode ?? code).replace(/\D/g, '');
    if (token.length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    const type: Channel = channel ?? (identifier.includes('@') ? 'email' : 'phone');

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = type === 'email'
        ? { type: 'email' as const, email: identifier, token }
        : { type: 'sms' as const, phone: identifier, token };
      const { error: verifyError } = await supabase.auth.verifyOtp(payload);
      if (verifyError) throw verifyError;

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_id');
        sessionStorage.removeItem('pending_channel');
      }

      router.replace('/onboard?src=join');
    } catch (err: any) {
      setTriesRemaining((current) => {
        const next = current - 1;
        if (next <= 0) {
          setError('Too many attempts. Please wait 2 minutes, then request a new code.');
        } else {
          setError('That code didn’t work. Try again or resend after 30 seconds.');
        }
        return Math.max(0, next);
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!identifier) return;
    if (resendIn > 0) return;

    const type: Channel = channel ?? (identifier.includes('@') ? 'email' : 'phone');

    if (type === 'phone' && !SMS_ENABLED) {
      setError('SMS is paused. Use email to receive your code.');
      return;
    }

    setError(null);
    setCode('');
    setTriesRemaining(OTP_MAX_ATTEMPTS);

    try {
      if (type === 'email') {
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: { shouldCreateUser: true },
        });
        if (sendError) throw sendError;
      } else {
        const { error: sendError } = await supabase.auth.signInWithOtp({ phone: identifier });
        if (sendError) throw sendError;
      }
      setResendIn(OTP_RESEND_SECONDS);
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (err: any) {
      setError(err?.message || 'Could not resend. Try again soon.');
    }
  }

  if (!identifier) {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
        <section className="max-w-md mx-auto px-6 py-12">
          <h1 className="text-2xl font-semibold mb-3">Verification needed</h1>
          <p className="text-sm text-slate-300 mb-6">
            There’s no pending request. Start again to receive a new code.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('pending_id');
                sessionStorage.removeItem('pending_channel');
              }
              router.replace('/join');
            }}
            className="rounded-2xl px-4 py-3 bg-white text-black font-semibold"
          >
            Go to Join
          </button>
        </section>
      </main>
    );
  }

  const masked = maskIdentifier(identifier);
  const locked = triesRemaining <= 0;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <section className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">Enter your 6-digit code</h1>
        <p className="text-sm text-slate-300 mb-6">
          We sent it to <b>{masked}</b>. Expires in {Math.round(OTP_TTL_SECONDS / 60)} minutes.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            verify();
          }}
          className="space-y-4"
        >
          <input
            ref={inputRef}
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              if (digits.length === 6) {
                setTimeout(() => verify(digits), 20);
              }
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted) {
              event.preventDefault();
              setCode(pasted);
              if (pasted.length === 6) {
                setTimeout(() => verify(pasted), 20);
              }
            }
          }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={locked || submitting}
            placeholder="123456"
            className="w-full rounded-2xl border border-white/15 bg-white text-black dark:bg-neutral-900 dark:text-white px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
            aria-label="One-time code"
          />

          <button
            type="submit"
            disabled={locked || submitting || code.length !== 6}
            className="w-full rounded-2xl bg-emerald-400 text-black font-semibold px-4 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verifying…' : 'Continue'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4 text-sm text-slate-300">
          <button
            onClick={resend}
            disabled={resendIn > 0 || locked}
            className="underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('pending_id');
                sessionStorage.removeItem('pending_channel');
              }
              router.replace('/join');
            }}
            className="underline"
          >
            Use a different address/number
          </button>
        </div>

        {locked ? (
          <p className="text-sm text-rose-400 mt-4">
            Too many attempts. Please wait 2 minutes, then request a new code.
          </p>
        ) : null}
        {error && !locked ? (
          <p className="text-sm text-rose-400 mt-4">{error}</p>
        ) : null}
      </section>
    </main>
  );
}
