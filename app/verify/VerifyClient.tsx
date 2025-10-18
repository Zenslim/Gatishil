'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { maskIdentifier } from '@/lib/auth/validate';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS, OTP_TTL_SECONDS } from '@/lib/constants/auth';

const GENERIC_ERROR = 'That code didn’t work. Try again or resend after 30 seconds.';
const SOFT_LOCK_ERROR = 'Too many attempts. Please wait 2 minutes, then request a new code.';

export default function VerifyClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [identifier, setIdentifier] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [resendIn, setResendIn] = useState(OTP_RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockActive, setLockActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pendingId = sessionStorage.getItem('pending_id');
    if (pendingId) {
      setIdentifier(pendingId);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (code.length < 6 && !lockActive) {
      setError(null);
    }
  }, [code, lockActive]);

  const isEmail = !!identifier && identifier.includes('@');
  const masked = identifier ? maskIdentifier(identifier) : 'your contact';
  const locked = lockActive;

  useEffect(() => {
    if (!lockActive) return;
    const timeout = setTimeout(() => {
      setLockActive(false);
      setAttempts(0);
      setError(null);
    }, 2 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [lockActive]);

  async function verifyOtp(submitted?: string) {
    if (!identifier) {
      setError('That code didn’t work. Try again or resend after 30 seconds.');
      return;
    }
    if (submitting || locked) return;

    const digits = (submitted ?? code).replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      setError(GENERIC_ERROR);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEmail) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: 'email',
          email: identifier,
          token: digits,
        });
        if (verifyError) throw verifyError;
      } else {
        let response = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: identifier, code: digits }),
        });

        if (!response.ok && response.status !== 202) {
          response = await fetch('/api/otp/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: 'sms', phone: identifier, token: digits }),
          });
        }

        if (!response.ok && response.status !== 202) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'VERIFY_FAILED');
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_id');
      }
      router.replace('/onboard?src=join');
    } catch (err: any) {
      setAttempts((current) => {
        const next = current + 1;
        if (next >= OTP_MAX_ATTEMPTS) {
          setLockActive(true);
          setError(SOFT_LOCK_ERROR);
        } else {
          setError(GENERIC_ERROR);
        }
        return Math.min(next, OTP_MAX_ATTEMPTS);
      });
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await verifyOtp();
  }

  async function handleResend() {
    if (!identifier || resendIn > 0 || locked) return;

    try {
      if (isEmail) {
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: { shouldCreateUser: true },
        });
        if (sendError) throw sendError;
      } else {
        const response = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: identifier }),
        });
        if (!response.ok) {
          if (response.status === 503) {
            setError('SMS is unavailable. Use email to receive your code.');
          } else if (response.status === 400) {
            setError('Phone OTP is Nepal-only. Enter +977… or use email.');
          } else {
            const payload = await response.json().catch(() => ({}));
            setError(payload?.error || GENERIC_ERROR);
          }
          return;
        }
      }

      setError(null);
      setCode('');
      setAttempts(0);
      setLockActive(false);
      setResendIn(OTP_RESEND_SECONDS);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err?.message || GENERIC_ERROR);
    }
  }

  if (!identifier) {
    return (
      <main className="min-h-dvh bg-slate-950 text-white">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
          <h1 className="text-2xl font-semibold">Enter your 6-digit code</h1>
          <p className="mt-3 text-sm text-slate-300">
            We sent it to {masked}. Expires in {Math.round(OTP_TTL_SECONDS / 60)} minutes.
          </p>
          <button
            onClick={() => router.replace('/join')}
            className="mt-6 w-full rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-900"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold">Enter your 6-digit code</h1>
        <p className="mt-3 text-sm text-slate-300">
          We sent it to <span className="font-semibold text-white">{masked}</span>. Expires in {Math.round(OTP_TTL_SECONDS / 60)} minutes.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            ref={inputRef}
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              if (digits.length === 6) {
                setTimeout(() => verifyOtp(digits), 50);
              }
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              if (pasted) {
                event.preventDefault();
                setCode(pasted);
                if (pasted.length === 6) {
                  setTimeout(() => verifyOtp(pasted), 50);
                }
              }
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            disabled={submitting || locked}
            className="w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-white"
          />

          <button
            type="submit"
            disabled={submitting || locked || code.length !== 6}
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-base font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Continue'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
          <button
            onClick={handleResend}
            disabled={resendIn > 0 || locked}
            className="underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('pending_id');
              }
              router.replace('/join');
            }}
            className="underline"
          >
            Use a different contact
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      </div>
    </main>
  );
}
