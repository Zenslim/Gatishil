// Minimal client for OTP flows.
// - SMS: hits your custom API (/api/otp/send, /api/otp/verify)
// - Email: leaves verification to Supabase (email link)
export async function sendSmsOtp(phone: string) {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "sms", phone }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Could not send SMS OTP.");
  }
  return data; // { ok:true, sent:true, ... }
}

export async function verifySmsOtp(phone: string, code: string) {
  // IMPORTANT: do NOT call supabase.auth.verifyOtp() for SMS.
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || "Could not verify code.");
  }
  return data; // { ok:true, verified:true, ... }
}

export async function sendEmailOtp(email: string, redirectTo?: string) {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "email", email, redirectTo }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Could not send email OTP.");
  }
  return data;
}
