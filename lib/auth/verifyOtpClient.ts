// lib/auth/verifyOtpClient.ts
// PHONE uses our API (Custom SoT), EMAIL uses Supabase via API.
// On success (phone), set session with returned tokens.

import { createClient } from "@supabase/supabase-js";

export async function verifyOtpAndSync(input: { phone?: string; code?: string; email?: string; token?: string; type?: string }) {
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) {
    const msg = j?.message || j?.error || "Verification failed";
    throw new Error(msg);
  }

  // For phone verification, API returns tokens. For email, your existing flow may set session elsewhere.
  if (input.phone && j.access_token && j.refresh_token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(url, anon);
    await supabase.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
  }

  return j;
}
