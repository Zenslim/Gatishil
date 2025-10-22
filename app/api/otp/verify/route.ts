import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServiceRoleClient, createAnonClientForCookies } from "@/lib/supabase/serverClient";
import crypto from "crypto";

const Body = z.object({
  phone: z.string().min(10).startsWith("+"),
  code: z.string().min(4).max(8),
});

// Deterministic server password for phone users (so we can sign them in via password safely)
function phonePassword(phone: string) {
  const seed = process.env.SERVER_PHONE_PASSWORD_SEED || "change-me";
  return crypto.createHmac("sha256", seed).update(phone).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code } = Body.parse(body);

    // 1) Verify OTP against our custom otps table (Aakash SMS pipeline)
    //    Expect table public.otps(phone text, code text, expires_at timestamptz, consumed_at timestamptz)
    const srv = createServiceRoleClient();

    // Lookup
    const { data: otpRow, error: otpErr } = await srv
      .from("otps")
      .select("id, phone, code, expires_at, consumed_at")
      .eq("phone", phone)
      .eq("code", code)
      .is("consumed_at", null)
      .maybeSingle();

    if (otpErr) {
      console.error("OTP lookup error", otpErr);
      return NextResponse.json({ ok: false, error: "otp_lookup_failed" }, { status: 400 });
    }
    if (!otpRow) {
      return NextResponse.json({ ok: false, error: "invalid_or_used_code" }, { status: 400 });
    }
    if (otpRow.expires_at && new Date(otpRow.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "otp_expired" }, { status: 400 });
    }

    // Mark consumed
    await srv.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

    // 2) Ensure an auth user exists that uses REAL phone (no alias email), with deterministic password
    const deterministicPassword = phonePassword(phone);

    // Try create user (if exists, Supabase will throw 422)
    let createdUserId: string | null = null;
    {
      const { data: created, error: createErr, status } = await srv.auth.admin.createUser({
        phone,
        password: deterministicPassword,
        phone_confirm: true,
        user_metadata: { provider: "phone", e164: phone },
      });
      if (!createErr && created?.user?.id) {
        createdUserId = created.user.id;
      } else if (status === 422) {
        // User already exists; ok to proceed
      } else if (createErr) {
        console.warn("createUser warning (continuing if exists):", createErr);
      }
    }

    // 3) Sign the user in with phone+password to mint a normal session (no admin token hack)
    const anon = createAnonClientForCookies();
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      phone,
      password: deterministicPassword,
    });
    if (signInErr) {
      // If password mismatch (e.g., pre-existing user), try to reset it via admin then retry
      if (signInErr.message?.toLowerCase().includes("invalid login")) {
        // Reset password
        const { data: list, error: listErr } = await srv
          .from("auth.users") // not accessible; fallback to admin API does not list by phone. We attempt update via password recovery:
          // NOTE: Supabase Admin API lacks direct update-by-phone; so try admin.createUser again with same phone+password; if still fails, return error.
          .select("*"); // no-op but avoids TS complaints
        // Attempt admin password update if we somehow know the id; skip and fail if cannot.
        return NextResponse.json({ ok: false, error: "password_mismatch_existing_phone_user" }, { status: 400 });
      }
      console.error("signInWithPassword error", signInErr);
      return NextResponse.json({ ok: false, error: "signin_failed" }, { status: 400 });
    }

    // Set cookie via auth-helpers cookie jar (signInWithPassword already set session cookies on response headers in edge/server runtime)
    // NextResponse will carry Set-Cookie from anon client fetch under the hood

    // 4) Upsert profile to copy phone (email stays NULL)
    const { data: profile, error: upsertErr } = await srv
      .from("profiles")
      .upsert({ id: signIn.user.id, phone, email: null })
      .select("id")
      .single();
    if (upsertErr) {
      console.warn("profiles upsert warning", upsertErr);
    }

    // 5) Redirect into unified onboarding wizard
    return NextResponse.json({ ok: true, next: "/onboard?src=join&step=welcome" });
  } catch (e: any) {
    console.error("verify route error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}