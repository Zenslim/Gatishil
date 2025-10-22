// lib/auth/verifyOtpClient.ts
// Both phone and email OTP verification routes return Supabase tokens.
// The helper sets the browser session and hands the response back to the caller.

import { getSupabaseBrowser } from "@/lib/supabaseClient";

type VerifyInput = { phone?: string; code?: string; email?: string; token?: string; type?: string };

export async function verifyOtpAndSync(input: VerifyInput) {
  const payload: Record<string, unknown> = { ...input };

  if (payload.email && payload.code && !payload.token) {
    payload.token = payload.code;
    delete payload.code;
    if (!payload.type) {
      payload.type = "email";
    }
  }

  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    const msg = j?.message || j?.error || "Verification failed";
    throw new Error(msg);
  }

  if (j.access_token) {
    const supabase = getSupabaseBrowser();
    await supabase.auth.setSession({
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? null,
    });
  }

  return j;
}
