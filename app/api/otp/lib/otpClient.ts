// Canonical client: always send +97798xxxxxxxx to server and NEVER call supabase.auth.verifyOtp for SMS.
export function toNepalE164(input: string): string {
  const digits = String(input || "").replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(digits)) return `+977${digits}`;
  if (/^9779(6|7|8)\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+9779(6|7|8)\d{8}$/.test(input)) return input;
  throw new Error("Nepal numbers only. Enter 10-digit 98xxxxxxxx or +97798xxxxxxxx.");
}

export async function sendSmsOtp(rawPhone: string) {
  const phone = toNepalE164(rawPhone);
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "sms", phone }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Could not send SMS OTP.");
  return data;
}

export async function verifySmsOtp(rawPhone: string, code: string) {
  const phone = toNepalE164(rawPhone);
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || data?.ok === false) throw new Error(data?.message || "Could not verify code.");
  return data;
}

// Email still goes through your existing flow using Supabase magic link (unchanged).
