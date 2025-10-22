import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createBasicClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

/* ---------- Supabase helpers ---------- */
function srv(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createBasicClient(url, key, { auth: { persistSession: false } });
}
function anon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBasicClient(url, key, { auth: { persistSession: false } });
}

/* ---------- Validation helpers ---------- */
function isDigits(s: string) { return /^[0-9]+$/.test(s); }
function isCode(s: string) { return typeof s === "string" && s.length >= 4 && s.length <= 8 && isDigits(s); }
function isE164ish(s: string) { return typeof s === "string" && /^\+?[0-9]{9,15}$/.test(s.replace(/\s+/g,"")); }

/* ---------- Phone normalization ---------- */
/** Keep only digits. Prefer last 10 GSM digits for Nepal matching. */
function normalizeToLocal10Digits(input: string): string {
  const digits = (input || "").replace(/\D+/g, "");
  // Common cases: +97798XXXXXXXX -> 98XXXXXXXXXX; 97798… -> 98…; 0XXXXXXXXX -> XXXXXXXXX
  let d = digits;
  if (d.startsWith("977")) d = d.slice(3);      // drop country code if present
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1); // drop leading 0 local form
  // If still longer than 10, keep the last 10 (SIM identifiers are 10 for Nepali mobiles)
  if (d.length > 10) d = d.slice(-10);
  return d;
}
function toE164(phone: string): string {
  const d = (phone || "").replace(/\D+/g, "");
  if (d.startsWith("977")) return `+${d}`;
  if (d.length === 10) return `+977${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+977${d.slice(1)}`;
  // Fallback: assume already has country code but missing '+'
  return d.startsWith("9") && d.length > 10 ? `+${d}` : `+${d}`;
}

/* ---------- Password derivation (deterministic) ---------- */
function phonePassword(phoneE164: string) {
  const seed = process.env.SERVER_PHONE_PASSWORD_SEED || "change-me";
  return crypto.createHmac("sha256", seed).update(phoneE164).digest("hex");
}

/* ---------- Route ---------- */
export async function POST(req: Request) {
  // Optional debug: add ?debug=1 to the URL to get more verbose error messages during testing
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body?.phone ?? "").trim();
    const code = String(body?.code ?? "").trim();

    // Basic format guards
    if (!isE164ish(rawPhone)) {
      return NextResponse.json({ ok: false, error: "bad_phone_format", detail: debug ? { rawPhone } : undefined }, { status: 400 });
    }
    if (!isCode(code)) {
      return NextResponse.json({ ok: false, error: "bad_code_format", detail: debug ? { code } : undefined }, { status: 400 });
    }

    const db = srv();

    /* 1) Pull candidate OTP rows by CODE first, not by phone (avoid strict SQL equality on phone) */
    // Columns: id, phone, code, expires_at, consumed_at (created_at optional)
    const { data: rows, error: selErr } = await db
      .from("otps")
      .select("id, phone, code, expires_at, consumed_at")
      .eq("code", code)
      .is("consumed_at", null);

    if (selErr) {
      if (debug) console.error("OTP select error", selErr);
      return NextResponse.json({ ok: false, error: "otp_lookup_failed" }, { status: 400 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_or_used_code" }, { status: 400 });
    }

    /* 2) Tolerant phone match in JS */
    const want10 = normalizeToLocal10Digits(rawPhone);
    let found: any = null;

    for (const r of rows) {
      const row10 = normalizeToLocal10Digits(String(r.phone ?? ""));
      // Also reject expired ones even if present
      const isExpired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
      if (!isExpired && row10 && want10 && row10 === want10) {
        found = r;
        break;
      }
    }

    if (!found) {
      return NextResponse.json(
        { ok: false, error: "invalid_or_used_code", detail: debug ? { want10, tried: rows.map(r => normalizeToLocal10Digits(String(r.phone ?? ""))) } : undefined },
        { status: 400 }
      );
    }

    /* 3) Consume OTP (idempotent by id) */
    await db.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", found.id);

    /* 4) Ensure real phone user (no alias email) */
    const phoneE164 = toE164(rawPhone);
    const deterministicPassword = phonePassword(phoneE164);
    const created = await db.auth.admin.createUser({
      phone: phoneE164,
      password: deterministicPassword,
      phone_confirm: true,
      user_metadata: { provider: "phone", e164: phoneE164 },
    });
    if (created.error && created.status !== 422) {
      if (debug) console.warn("admin.createUser warning", created.error);
      // continue; user may already exist with different password
    }

    /* 5) Sign in and set cookies manually */
    const pub = anon();
    const { data: signIn, error: signInErr } = await pub.auth.signInWithPassword({
      phone: phoneE164,
      password: deterministicPassword,
    });
    if (signInErr || !signIn?.session) {
      if (debug) console.error("signInWithPassword error", signInErr);
      // If there’s an existing user with a different password, we surface a clear error
      return NextResponse.json({ ok: false, error: "password_mismatch_existing_phone_user" }, { status: 400 });
    }

    const cookieStore = cookies();
    const prod = process.env.NODE_ENV === "production";
    cookieStore.set("sb-access-token", signIn.session.access_token, {
      httpOnly: true, secure: prod, sameSite: "lax", path: "/",
      expires: new Date(Date.now() + signIn.session.expires_in * 1000),
    });
    cookieStore.set("sb-refresh-token", signIn.session.refresh_token, {
      httpOnly: true, secure: prod, sameSite: "lax", path: "/",
      maxAge: 60 * 60 * 24 * 28,
    });

    /* 6) Ensure profile mirrors real phone, email NULL */
    await db.from("profiles").upsert(
      { id: signIn.user.id, phone: phoneE164, email: null },
      { onConflict: "id" }
    );

    return NextResponse.json({ ok: true, next: "/onboard?src=join&step=welcome" });
  } catch (e: any) {
    console.error("verify route error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
