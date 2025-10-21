// app/api/otp/verify/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { sha256Hex } from "@/lib/server/hash";

const NEPAL_E164 = /^\+977\d{9,10}$/;

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { phone, code, email, token, type } = body || {};

  // ── PHONE: verify against our hash table, then mint a Supabase session ────────
  if (typeof phone === "string" && typeof code === "string") {
    if (!NEPAL_E164.test(phone)) {
      return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }

    // 1) Fetch OTP row
    const { data: otp, error: otpErr } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("e164_phone", phone)
      .single();
    if (otpErr || !otp) {
      return NextResponse.json({ ok: false, error: "NO_OTP" }, { status: 400 });
    }

    // 2) TTL & attempts
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "OTP_EXPIRED" }, { status: 401 });
    }
    if ((otp.attempts_left ?? 0) <= 0) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_ATTEMPTS" }, { status: 429 });
    }

    // 3) Verify
    const match = sha256Hex(code) === otp.code_hash;
    await supabaseAdmin
      .from("phone_otps")
      .update({ attempts_left: Math.max(0, (otp.attempts_left || 0) - 1) })
      .eq("e164_phone", phone);

    if (!match) {
      return NextResponse.json({ ok: false, error: "BAD_CODE" }, { status: 401 });
    }

    // 4) Create/update user and mark phone confirmed; set server-only password
    const seed = process.env.SERVER_PHONE_PASSWORD_SEED as string;
    if (!seed) return NextResponse.json({ ok: false, error: "MISSING_SERVER_PHONE_PASSWORD_SEED" }, { status: 500 });
    const password = sha256Hex(`${seed}:${phone}`).slice(0, 32);

    // Try create; if exists, update
    let userId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password,
      user_metadata: { signup_method: "phone_custom_otp" },
    });
    if (created.data?.user?.id) {
      userId = created.data.user.id;
    } else {
      // If already exists, find and update
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list.data?.users?.find((u: any) => u.phone === phone);
      if (found) {
        userId = found.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          phone,
          phone_confirm: true,
          password,
        });
      }
    }
    if (!userId) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND_OR_CREATED" }, { status: 500 });
    }

    // 5) Create a session server-side via phone+password; return tokens
    const sb = supabaseAnon();
    const sign = await sb.auth.signInWithPassword({ phone, password });
    if (sign.error || !sign.data?.session) {
      return NextResponse.json({ ok: false, error: "SIGNIN_FAILED", message: sign.error?.message }, { status: 500 });
    }

    // Optional cleanup
    await supabaseAdmin.from("phone_otps").delete().eq("e164_phone", phone);

    return NextResponse.json(
      {
        ok: true,
        access_token: sign.data.session.access_token,
        refresh_token: sign.data.session.refresh_token,
        token_type: sign.data.session.token_type,
        expires_in: sign.data.session.expires_in,
        next: "/onboard?src=otp",
      },
      { status: 200 }
    );
  }

  // ── EMAIL: untouched — your existing email verify flow remains elsewhere ──────
  return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
}
