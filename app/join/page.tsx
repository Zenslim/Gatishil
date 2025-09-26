// app/join/page.tsx
// Gatishil — First-time Security Ritual → then Dashboard
//
// ELI15: You just signed in (OTP or provider). This page asks you to set a
// password once so your device can remember it (FaceID/TouchID/biometrics).
// After saving, we send you straight to /dashboard. If you already set it,
// you’re taken to /dashboard instantly.
//
// No client JS required. Uses a Server Action to set password via Supabase SSR.
// Works on GitHub + Vercel + Supabase (remote-only).
//
// Prereqs (sensible defaults):
// • Table: public.profiles (id uuid PK = auth.users.id). Add boolean password_set default false.
//   SQL once (run in Supabase SQL editor if you haven’t):
//   alter table public.profiles add column if not exists password_set boolean not null default false;
//
// Feel: simple, dignified, zero-friction.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";

// Force dynamic because we read auth cookies each request
export const dynamic = "force-dynamic";

export default async function JoinSecurityPage() {
  // 1) Make SSR Supabase client bound to user cookies
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 2) Require a session (you reached here after OTP/provider)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // 3) Check if password already set (profile flag). If missing, treat as not set.
  let passwordSet = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("password_set")
      .eq("id", session.user.id)
      .maybeSingle();

    passwordSet = Boolean(profile?.password_set);
  } catch {
    // If profiles table not ready yet, we still show the set-password ritual.
    passwordSet = false;
  }

  if (passwordSet) {
    // You’ve already done the ritual → go inside.
    redirect("/dashboard");
  }

  // 4) Render the one clear action: set password now → go inside
  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-semibold">Gatishil — Entry</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
            Skip for now →
          </Link>
        </div>
      </header>

      <section className="max-w-xl mx-auto px-4 pt-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold">Set your key once</h2>
          <p className="text-white/70 mt-2 text-sm">
            Save a password your device can remember. Next time, your phone or laptop
            will offer biometrics (FaceID/TouchID) to fill it—no OTP gatekeeper.
          </p>

          <form action={setPasswordAndEnter.bind(null, session.user.id)} className="mt-6 space-y-3">
            <div>
              <label className="block text-sm text-white/80 mb-1">New password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Confirm password</label>
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                placeholder="Repeat your password"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white text-black px-4 py-2.5 font-medium hover:opacity-90"
            >
              Save & enter the interior →
            </button>

            <p className="text-xs text-white/60">
              Tip: when your browser asks to “Save Password,” say yes. Most devices let you unlock
              saved passwords with biometrics—one-tap sign-in next time.
            </p>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">
          You can change this later in <Link href="/security" className="underline">Security</Link>.
        </div>
      </section>
    </main>
  );
}

// --- Server Action ------------------------------------------------------------

async function setPasswordAndEnter(userId: string, formData: FormData) {
  "use server";

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!password || password.length < 8 || password !== confirm) {
    // Gentle, deterministic failure: send back to /join with no state leaks.
    redirect("/join?error=weak-or-mismatch");
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Next SSR needs mutable hooks when auth updates cookies; provide no-ops for safety.
        set() {},
        remove() {},
      },
    }
  );

  // 1) Set the password on the authenticated user (uses session cookies)
  const { error: upErr } = await supabase.auth.updateUser({ password });
  if (upErr) {
    // If update fails, bounce back to ritual with a simple code
    redirect("/join?error=update-failed");
  }

  // 2) Mark the ritual done (so future visits skip /join)
  await supabase
    .from("profiles")
    .upsert({ id: userId, password_set: true }, { onConflict: "id" });

  // 3) Straight to the interior
  redirect("/dashboard");
}
