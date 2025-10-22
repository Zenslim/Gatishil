'use client';

// lib/auth/verifyOtpClient.ts
// Legacy convenience helper retained for callers expecting a unified interface.

import { supabase } from '@/lib/supabaseClient';

type VerifyInput = { phone?: string; code?: string; email?: string; token?: string };

const PHONE_VERIFY_ENDPOINT = '/api/otp/phone/verify';

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function verifyOtpAndSync(input: VerifyInput) {
  if (input.phone) {
    const res = await fetch(PHONE_VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: input.phone, code: input.code }),
    });
    const j = await parseJson(res);
    if (!res.ok || j?.ok !== true) {
      throw new Error(j?.message || j?.error || 'Verification failed');
    }
    const access_token = j?.session?.access_token as string | undefined;
    const refresh_token = j?.session?.refresh_token as string | undefined;
    if (!access_token || !refresh_token) {
      throw new Error('Could not establish session from phone OTP.');
    }
    await supabase.auth.setSession({ access_token, refresh_token });
    return j;
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
