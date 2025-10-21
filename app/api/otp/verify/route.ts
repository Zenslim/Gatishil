import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEPAL_E164 = /^\+977\d{9,10}$/;
const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { phone, code, email, token, type } = body || {};

    // Helper to read env safely at runtime (no build-time throws)
    const env = (k: string) => process.env[k] || "";

    // ─────────────────────────────────────────────
    // PHONE VERIFY (custom → mint Supabase session)
    // ─────────────────────────────────────────────
    if (typeof phone === "string" && typeof code === "string") {
      const e164 = phone.trim();
      const codeStr = code.trim();

      if (!NEPAL_E164.test(e164)) {
        return NextResponse.json(
          { ok: false, error: "INVALID_PHONE", message: "Nepal-only: +977XXXXXXXXXX" },
          { status: 400 }
        );
      }
      if (codeStr.length !== 6) {
        return NextResponse.json(
          { ok: false, error: "INVALID_CODE", message: "6-digit code required" },
          { status: 400 }
        );
      }

      // Read env at runtime
      const URL = env("NEXT_PUBLIC_SUPABASE_URL");
      const ANON = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      const SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
      const SEED = env("SERVER_PHONE_PASSWORD_SEED");

      // Guard missing envs at request-time (not build-time)
      if (!URL || !ANON || !SERVICE) {
        return NextResponse.json(
          { ok: false, error: "SERVER_MISCONFIG", message: "Supabase env vars are missing" },
          { status: 500 }
        );
      }
      if (!SEED) {
        return NextResponse.json(
          { ok: false, error: "SERVER_PHONE_PASSWORD_SEED_MISSING", message: "Set SERVER_PHONE_PASSWORD_SEED" },
          { status: 500 }
        );
      }

      // Create clients now (runtime)
      const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
      const anon = createClient(URL, ANON, { auth: { persistSession: false } });

      // 1) Fetch OTP row (hash, ttl, attempts)
      const { data: otp, error: otpErr } = await admin
        .from("phone_otps")
        .select("code_hash, expires_at, attempts_left")
        .eq("e164_phone", e164)
        .single();

      if (otpErr || !otp) return NextResponse.json({ ok: false, error: "NO_OTP" }, { status: 400 });
      if (new Date(otp.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 401 });
      }
      if ((otp.attempts_left ?? 0) <= 0) {
        return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
      }

      // 2) Verify code by hash
      const match = sha256Hex(codeStr) === otp.code_hash;
      await admin
        .from("phone_otps")
        .update({ attempts_left: Math.max(0, (otp.attempts_left || 0) - 1) })
        .eq("e164_phone", e164);
      if (!match) return NextResponse.json({ ok: false, error: "BAD_CODE" }, { status: 401 });

      // 3) Ensure user exists, confirm phone, set server-derived password
      const password = sha256Hex(`${SEED}:${e164}`).slice(0, 32);

      let userId: string | null = null;
      const created = await admin.auth.admin.createUser({
        phone: e164,
        phone_confirm: true,
        password,
        user_metadata: { signup_method: "phone_custom_otp" },
      });
      if (created.data?.user?.id) {
        userId = created.data.user.id;
      } else {
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list.data?.users?.find((u: any) => u.phone === e164);
        if (found) {
          userId = found.id;
          await admin.auth.admin.updateUserById(userId, {
            phone: e164,
            phone_confirm: true,
            password,
          });
        }
      }
      if (!userId) {
        return NextResponse.json({ ok: false, error: "USER_NOT_FOUND_OR_CREATED" }, { status: 500 });
      }

      // 4) Mint a session via phone+password and return tokens
      const sign = await anon.auth.signInWithPassword({ phone: e164, password });
      if (sign.error || !sign.data?.session) {
        return NextResponse.json(
          { ok: false, error: "SIGNIN_FAILED", message: sign.error?.message },
          { status: 500 }
        );
      }

      // Optional cleanup
      await admin.from("phone_otps").delete().eq("e164_phone", e164);

      const s = sign.data.session;
      return NextResponse.json(
        {
          ok: true,
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          token_type: s.token_type,
          expires_in: s.expires_in,
          next: "/onboard?src=otp",
        },
        { status: 200 }
      );
    }

    // ─────────────────────────────────────────────
    // EMAIL VERIFY (unchanged; keep if you use it)
    // ─────────────────────────────────────────────
    if (typeof email === "string" && typeof token === "string") {
      const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const sb = createClient(URL, ANON, { auth: { persistSession: false } });

      const { data, error } = await sb.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: (type as any) ?? "email",
      });
      if (error) {
        return NextResponse.json(
          { ok: false, error: "EMAIL_OTP_VERIFY_FAILED", message: error.message },
          { status: 401 }
        );
      }
      const session = data?.session ?? (await sb.auth.getSession()).data.session ?? null;
      if (!session?.access_token) {
        return NextResponse.json(
          { ok: false, error: "SESSION_MISSING", message: "Verified but no session" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          ok: true,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: session.token_type,
          expires_in: session.expires_in,
          next: "/onboard?src=otp",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Provide { phone, code } or { email, token }." },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED", message: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
