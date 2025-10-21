import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEPAL_E164 = /^\+977\d{9,10}$/;
const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const EXPIRY_GRACE_MS = 2 * 60 * 1000; // tolerate small clock skew

// stable alias email for any phone (no collisions, valid email syntax)
function aliasEmailFor(phoneE164: string) {
  // p9779863...@gn.local
  return `p${phoneE164.replace(/^\+/, "")}@gn.local`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { phone, code, email, token, type } = body || {};

    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const SEED = process.env.SERVER_PHONE_PASSWORD_SEED || "";

    // ─────────────────────────────────────────────
    // PHONE: Custom SoT → verify hash → sign in via alias email (no phone provider)
    // ─────────────────────────────────────────────
    if (typeof phone === "string" && typeof code === "string") {
      if (!NEPAL_E164.test(phone)) {
        return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
      }
      if (code.trim().length !== 6) {
        return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
      }
      if (!URL || !ANON || !SERVICE || !SEED) {
        return NextResponse.json({ ok: false, error: "SERVER_MISCONFIG" }, { status: 500 });
      }

      const admin = createClient(URL, SERVICE, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const anon = createClient(URL, ANON, { auth: { persistSession: false } });

      // 1) Load latest unused OTP for this phone
      const { data: row, error: selErr } = await admin
        .from("otps")
        .select("id, code_hash, expires_at, attempt_count, used_at, verified_at")
        .eq("phone", phone)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selErr || !row) {
        return NextResponse.json(
          { ok: false, error: "NO_OTP", message: "No active code. Request a new one." },
          { status: 400 }
        );
      }

      // 2) TTL (with grace) and hash match
      const now = Date.now();
      const exp = new Date(row.expires_at).getTime();
      if (exp + EXPIRY_GRACE_MS < now) {
        return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 401 });
      }

      const match = sha256Hex(code.trim()) === row.code_hash;

      // record attempt (best-effort)
      await admin
        .from("otps")
        .update({ attempt_count: (row.attempt_count || 0) + 1 })
        .eq("id", row.id);

      if (!match) {
        return NextResponse.json({ ok: false, error: "BAD_CODE" }, { status: 401 });
      }

      // 3) Mark used/verified
      const usedAtIso = new Date().toISOString();
      await admin.from("otps").update({ used_at: usedAtIso, verified_at: usedAtIso }).eq("id", row.id);

      // 4) Ensure a Supabase user exists BUT via a synthetic email alias (no phone-provider needed)
      const emailAlias = aliasEmailFor(phone);
      const password = sha256Hex(`${SEED}:${phone}`).slice(0, 32);

      let userId: string | null = null;

      // Try to create alias-email user
      const created = await admin.auth.admin.createUser({
        email: emailAlias,
        email_confirm: true, // no email sent; mark confirmed
        password,
        user_metadata: { signup_method: "phone_custom_otp", phone_e164: phone },
      });

      if (created.data?.user?.id) {
        userId = created.data.user.id;
      } else {
        // If exists, locate and update by alias (or by phone fallback)
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found =
          list.data?.users?.find((u: any) => u.email === emailAlias) ||
          list.data?.users?.find((u: any) => u.phone === phone);
        if (found) {
          userId = found.id;
          await admin.auth.admin.updateUserById(userId, {
            email: emailAlias,
            email_confirm: true,
            password,
            user_metadata: { ...(found.user_metadata || {}), phone_e164: phone, signup_method: "phone_custom_otp" },
          });
        }
      }

      if (!userId) {
        return NextResponse.json({ ok: false, error: "USER_NOT_FOUND_OR_CREATED" }, { status: 500 });
      }

      // 5) Mint a session using EMAIL+PASSWORD (alias)
      const sign = await anon.auth.signInWithPassword({ email: emailAlias, password });
      if (sign.error || !sign.data?.session) {
        return NextResponse.json(
          { ok: false, error: "SIGNIN_FAILED", message: sign.error?.message },
          { status: 500 }
        );
      }

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
    // EMAIL: unchanged — Supabase verifies and returns a session
    // ─────────────────────────────────────────────
    if (typeof email === "string" && typeof token === "string") {
      if (!URL || !ANON) {
        return NextResponse.json({ ok: false, error: "SERVER_MISCONFIG" }, { status: 500 });
      }
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
