"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getValidatedNext } from "@/lib/auth/next";
import { verifyOtpAndSync } from "@/lib/auth/verifyOtpClient";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

export default function LoginClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const nextPath = getValidatedNext(undefined, "/dashboard");

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch("/api/auth/sync", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? null,
        }),
      });
    }
    router.push(nextPath);
  }

  async function onOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await verifyOtpAndSync({ email: email.trim(), code: otpCode.trim() });
      router.push(nextPath);
    } catch (err: any) {
      setError(err?.message || "OTP verify failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "";
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMessage("Magic link sent. Please check your email.");
  }

  return (
    <form className="space-y-4" onSubmit={onPasswordLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white"
        >
          {loading ? "Signing in…" : "Login"}
        </button>
        <button
          type="button"
          onClick={onMagicLink}
          disabled={loading}
          className="px-4 py-2 rounded border"
        >
          Email me a magic link
        </button>
      </div>
      <div className="space-y-2 border-t pt-4">
        <label className="block text-sm font-medium">Have a one-time code?</label>
        <input
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value)}
          placeholder="Enter 6-digit code"
          className="w-full border px-3 py-2 rounded"
        />
        <button
          type="button"
          onClick={onOtpLogin}
          disabled={loading || !otpCode.trim()}
          className="px-4 py-2 rounded bg-emerald-600 text-white"
        >
          {loading ? "Verifying…" : "Verify OTP"}
        </button>
      </div>
      {message && <p className="text-green-600">{message}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
