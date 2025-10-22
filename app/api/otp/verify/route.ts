import { NextResponse } from "next/server";
import { createServiceRoleClient, createSupabaseForRoute } from "@/lib/supabase/serverClient";
import crypto from "crypto";

function isE164Phone(s: string): boolean {
  return typeof s === "string" && s.startsWith("+") && s.replace("+","").length >= 10 && /^\+[0-9]+$/.test(s);
}
function isCode(s: string): boolean {
  return typeof s === "string" && s.length >= 4 && s.length <= 8 && /^[0-9]+$/.test(s);
}
function phonePassword(phone: string) {
  const seed = process.env.SERVER_PHONE_PASSWORD_SEED || "change-me";
  return crypto.createHmac("sha256", seed).update(phone).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? "");
    const code  = String(body?.code ?? "");

    if (!isE164Phone(phone)) {
      return NextResponse.json({ ok: false, error: "bad_phone_format" }, { status: 400 });
    }
    if (!isCode(code)) {
      return NextResponse.json({ ok: false, error: "bad_code_format" }, { status: 400 });
    }

    const srv = createServiceRoleClient();

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

    await srv.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

    const deterministicPassword = phonePassword(phone);
    const createRes = await srv.auth.admin.createUser({
      phone,
      password: deterministicPassword,
      phone_confirm: true,
      user_metadata: { provider: "phone", e164: phone },
    });
    if (createRes.error && createRes.status !== 422) {
      console.warn("admin.createUser warning", createRes.error);
    }

    const supa = createSupabaseForRoute();
    const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({
      phone,
      password: deterministicPassword,
    });
    if (signInErr) {
      console.error("signInWithPassword error", signInErr);
      return NextResponse.json({ ok: false, error: "password_mismatch_existing_phone_user" }, { status: 400 });
    }

    const upsert = await srv
      .from("profiles")
      .upsert({ id: signIn.user.id, phone, email: null }, { onConflict: "id" })
      .select("id")
      .single();
    if (upsert.error) {
      console.warn("profiles upsert warning", upsert.error);
    }

    return NextResponse.json({ ok: true, next: "/onboard?src=join&step=welcome" });
  } catch (e: any) {
    console.error("verify route error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
