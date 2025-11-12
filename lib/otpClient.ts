'use client';

// lib/otpClient.ts
// Channel-specific helpers mirroring the Join experience.

import { getFriendlySupabaseEmailError } from '@/lib/auth/emailErrorHints';
import { supabase } from '@/lib/supabase/client';

export async function sendPhoneOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms' },
  });
  if (error) {
    throw new Error(error.message || 'Could not send phone code');
  }
  return { ok: true };
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  });
  if (error) {
    throw new Error(error.message || 'Invalid or expired code');
  }
  if (!data?.session) {
    throw new Error('No session returned. Please try again.');
  }
  return data;
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
    options: { emailRedirectTo },
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
