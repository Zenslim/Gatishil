'use client';

// lib/auth/verifyOtpClient.ts
// Legacy convenience helper retained for callers expecting a unified interface.

import { supabase } from '@/lib/supabaseClient';

type VerifyInput = { phone?: string; code?: string; email?: string; token?: string };

export async function verifyOtpAndSync(input: VerifyInput) {
  if (input.phone) {
    const token = input.token ?? input.code;
    if (!token) {
      throw new Error('Phone OTP code required.');
    }
    const { data, error } = await supabase.auth.verifyOtp({
      phone: input.phone,
      token,
      type: 'sms',
    });
    if (error) {
      throw new Error(error.message || 'Verification failed');
    }
    if (!data?.session) {
      throw new Error('No session returned. Please try again.');
    }
    return { ok: true, provider: 'phone', session: data.session };
  }

  if (input.email) {
    const token = input.token ?? input.code;
    if (!token) {
      throw new Error('Email OTP token required.');
    }
    const { data, error } = await supabase.auth.verifyOtp({ email: input.email, token, type: 'email' });
    if (error) {
      throw new Error(error.message || 'Verification failed');
    }
    if (!data?.session) {
      throw new Error('No session returned. Please try again.');
    }
    return { ok: true, provider: 'email', session: data.session };
  }

  throw new Error('Phone or email required for OTP verification.');
}
