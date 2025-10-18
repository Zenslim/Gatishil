'use client';

import { useEffect, useState } from 'react';
import OtpInput from '@/lib/ui/OtpInput';
import { supabase } from '@/lib/supabase/client';
import { maskIdentifier } from '@/lib/auth/validate';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS } from '@/lib/constants/auth';

export default function VerifyClient() {
  const [id, setId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [tries, setTries] = useState(OTP_MAX_ATTEMPTS);
  const [err, setErr] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const v = sessionStorage.getItem('pending_id');
    setId(v);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function verify() {
    setErr(null);
    if (!id) {
      setErr('No pending verification. Go back to Join.');
      return;
    }
    if (tries <= 0) {
      setErr('Too many attempts. Please wait 2 minutes, then request a new code.');
      return;
    }
    if (code.length < 6) {
      setErr('Enter the 6-digit code.');
      return;
    }

    const type = id.includes('@') ? 'email' : 'phone';

    try {
      const { error } = await supabase.auth.verifyOtp({
        type: type === 'email' ? 'email' : 'sms',
        [type]: id,
        token: code,
      });
      if (error) throw error;

      // success → /onboard
      window.location.href = '/onboard?src=join';
    } catch (e: any) {
      setTries((current) => {
        const next = current - 1;
        if (next <= 0) {
          setErr('Too many attempts. Please wait 2 minutes, then request a new code.');
        } else {
          setErr('That code didn’t work. Try again or resend after 30 seconds.');
        }
        return next;
      });
    }
  }

  async function resend() {
    if (!id) return;
    if (resendIn > 0) return;
    setErr(null);
    try {
      if (id.includes('@')) {
        await supabase.auth.signInWithOtp({ email: id, options: { shouldCreateUser: true } });
      } else {
        await supabase.auth.signInWithOtp({ phone: id });
      }
      setResendIn(OTP_RESEND_SECONDS);
    } catch {
      setErr('Could not resend. Try again soon.');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-2">Enter your 6-digit code</h1>
      <p className="text-sm text-gray-400 mb-6">
        We sent it to <b>{maskIdentifier(id ?? '')}</b>. Expires in 5 minutes.
      </p>

      <OtpInput value={code} onChange={setCode} />

      <button className="w-full rounded px-3 py-2 bg-black text-white mt-6" onClick={verify}>
        Continue
      </button>

      <div className="flex items-center justify-between mt-3 text-sm">
        <button
          className="underline disabled:opacity-50"
          onClick={resend}
          disabled={resendIn > 0}
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
        </button>
        <a className="underline" href="/join">
          Use a different address/number
        </a>
      </div>

      {err && <p className="text-sm text-rose-500 mt-3">{err}</p>}
    </main>
  );
}
