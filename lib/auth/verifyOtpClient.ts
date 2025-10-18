// lib/auth/verifyOtpClient.ts
// Unified client-side OTP verification for email or phone (Supabase v2).
import type { SupabaseClient } from '@supabase/supabase-js';

export async function verifyOtpClient(supabase: SupabaseClient, id: string, code: string) {
  const type = id.includes('@') ? 'email' : 'sms';
  const params = type === 'email'
    ? { email: id, token: code, type: 'email' as const }
    : { phone: id, token: code, type: 'sms' as const };
  return supabase.auth.verifyOtp(params);
}

export default verifyOtpClient;
