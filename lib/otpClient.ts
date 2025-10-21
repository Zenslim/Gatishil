// lib/otpClient.ts
// Unified helpers consistent with Custom SoT for PHONE and native Supabase for EMAIL.

export async function sendPhoneOtp(phone: string) {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    throw new Error(j?.message || j?.error || "Could not send phone code");
  }
  return j; // { ok:true, mode:"phone_otp_sent", resend_after_seconds, [debug_code] }
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    throw new Error(j?.message || j?.error || "Invalid or expired code");
  }
  return j; // contains tokens + next
}

export async function sendEmailOtp(email: string, redirectTo?: string) {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    throw new Error(j?.message || j?.error || "Could not send email code");
  }
  return j; // { ok:true, mode:"email_otp_sent" }
}
