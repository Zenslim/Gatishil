'use client';

// lib/otpClient.ts
// Channel-specific helpers mirroring the Join experience.

import { getFriendlySupabaseEmailError } from '@/lib/auth/emailErrorHints';
import { supabase } from '@/lib/supabaseClient';

const PHONE_SEND_ENDPOINT = '/api/otp/phone/send';
const PHONE_VERIFY_ENDPOINT = '/api/otp/phone/verify';

async function parseJson(res: Response) {
  try { return await res.json(); } catch { return {}; }
}

export async function sendPhoneOtp(phone: string) {
  const res = await fetch(PHONE_SEND_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const j = await parseJson(res);
  if (!res.ok || j?.ok !== true) {
    throw new Error(j?.message || j?.error || 'Could not send phone code');
  }
  return j;
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const res = await fetch(PHONE_VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const j = await parseJson(res);
  if (!res.ok || j?.ok !== true) {
    throw new Error(j?.message || j?.error || 'Invalid or expired code');
  }
  return j;
}

export async function sendEmailOtp(email: string, redirectOrigin?: string) {
  const origin =
    redirectOrigin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.gatishilnepal.org');
  const emailRedirectTo = `${origin}/onboard?src=join`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  });
  if (error) {
    const friendly = getFriendlySupabaseEmailError(error);
    if (friendly) {
      console.error('[otpClient/sendEmailOtp] Supabase signInWithOtp failed:', error);
      throw new Error(friendly);
    }
    throw new Error(error.message || 'Could not send email code');
  }
  return { ok: true, emailRedirectTo };
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    throw new Error(error.message || 'Invalid or expired code');
  }
  if (!data?.session) {
    throw new Error('No session returned. Please try again.');
  }
  return data;
}
