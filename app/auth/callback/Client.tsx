// app/auth/callback/Client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type OtpType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "sms"
  | null;

function makeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, anon, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // we’re doing the exchange manually here
    },
  });
}

export default function Client() {
  const router = useRouter();
  const sp = useSearchParams();

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const code = sp.get("code"); // OAuth / PKCE
  const token_hash = sp.get("token_hash"); // Email magic link / OTP
  const type = (sp.get("type") as OtpType) ?? null;
  const next = sp.get("next") || "/onboard?src=join";

  const supabase = useMemo(() => {
    try {
      return makeSupabaseClient();
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase) {
        setStatus("error");
        setMessage("Auth client is not configured.");
        return;
      }

      // If we already have a session, skip exchange and go straight to `next`.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (!cancelled) {
          setStatus("done");
          router.replace(next);
        }
        return;
      }

      // We must have either ?code=… or ?token_hash=…&type=…
      if (!code && !(token_hash && type)) {
        setStatus("error");
        setMessage("No authentication credentials found. Please log in again.");
        return;
      }

      setStatus("working");
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) throw error;
        }

        // Double-check session now exists
        const { data: after } = await supabase.auth.getSession();
        if (!after.session) {
          throw new Error("Session was not established.");
        }

        if (!cancelled) {
          setStatus("done");
          router.replace(next);
        }
      } catch (err: any) {
        console.error("[/auth/callback] exchange failed:", err);
        if (!cancelled) {
          setStatus("error");
          setMessage(err?.message || "Authentication failed. Please try again.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase, code, token_hash, type, next, router]);

  // Minimal UI feedback
  return (
    <section className="max-w-md w-full text-center">
      {status === "idle" || status === "working" ? (
        <>
          <h1 className="text-xl font-semibold">Completing sign-in…</h1>
          <p className="mt-2 text-sm opacity-80">
            Please wait while we verify your credentials and create your session.
          </p>
        </>
      ) : null}

      {status === "done" ? (
        <>
          <h1 className="text-xl font-semibold">Signed in ✅</h1>
          <p className="mt-2 text-sm opacity-80">Redirecting you to your next step…</p>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <h1 className="text-xl font-semibold">Sign-in problem</h1>
          <p className="mt-2 text-sm opacity-80">{message}</p>
          <div className="mt-6">
            <a
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-block rounded-md px-4 py-2 border"
            >
              Go to Login
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
}
