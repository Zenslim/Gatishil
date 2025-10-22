import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createBasicClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

/** ---- helpers ---- **/
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
function isDigits(s: string) { return /^[0-9]+$/.test(s); }
function isCode(s: string) { return typeof s === "string" && s.length >= 4 && s.length <= 8 && isDigits(s); }
function isE164ish(s: string) { return typeof s === "string" && /^\+?[0-9]{10,15}$/.test(s.replace(/\s+/g,"")); }

function normalizeCandidates(rawPhone: string) {
  // Be generous: try common variants seen in Aakash + user input
  const p = (rawPhone || "").trim().replace(/\s+/g, "");
  const noPlus = p.replace(/^\+/, "");
  const noPlusNo977 = noPlus.replace(/^977/, "");      // "+97798..." -> "98..."
  const localLeading0 = noPlusNo977.replace(/^9/, "0"); // "98..." -> "0 8..." (common local)
  const unique = Array.from(new Set([p, noPlus, noPlusNo977, localLeading0]));
  return unique.filter(Boolean);
}

function phonePassword(phoneE164: string) {
  const seed = process.env.SERVER_PHONE_PASSWORD_SEED || "change-me";
  return crypto.createHmac("sha256", seed).update(phoneE164).digest("hex");
}

/** ---- route ---- **/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body?.phone ?? "");
    const code = String(body?.code ?? "").trim();

    if (!isE164ish(rawPhone)) {
      return NextResponse.json({ ok: false, error: "bad_phone_format" }, { status: 400 });
    }
    if (!isCode(code)) {
      return NextResponse.json({ ok: false, error: "bad_code_format" }, { status: 400 });
    }

    const candidates = normalizeCandidates(rawPhone);
    const db = srv();

    // 1) Try exact match first, then tolerant fallbacks
    //    We only accept non-consumed and non-expired rows.
    const selectCols = "id, phone, code, expires_at, consumed_at";
    let found: any = null;
    let lastErr: any = null;

    // helper to check a single phone candidate
    async function tryOne(phoneValue: string) {
      const q = db.from("otps")
        .select(selectCols)
        .eq("code", code)
        .eq("phone", phoneValue)
        .is("consumed_at", null);
      // If your table has created_at, prefer latest: .order("created_at", { ascending: false })
      const { data, error } = await q;
      if (error) { lastErr = error; return null; }
      if (Array.isArray(data) && data.length > 0) return data[0];
      return null;
    }

    // strict first: the raw phone as sent
    found = await tryOne(rawPhone);
    // then try tolerant variants
    for (const cand of candidates) {
      if (found) break;
      if (cand === rawPhone) continue;
      found = await tryOne(cand);
    }

    if (!found) {
      // nothing matched: either wrong code, already consumed, or phone formatting mismatch
      return NextResponse.json({ ok: false, error: "invalid_or_used_code" }, { status: 400 });
    }

    // expiry check
    if (found.expires_at && new Date(found.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: "otp_expired" }, { status: 400 });
    }

    // 2) Consume the OTP atomically (idempotent)
    await db.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", found.id);

    // 3) Ensure a real phone user exists (NO alias email), confirm phone, deterministic password
    //    Use an E.164 shape for password seed; if rawPhone lacks '+', prepend '+' now.
    const phoneE164 = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
    const deterministicPassword = phonePassword(phoneE164);

    const created = await db.auth.admin.createUser({
      phone: phoneE164,
      password: deterministicPassword,
      phone_confirm: true,
      user_metadata: { provider: "phone", e164: phoneE164 },
    });
    if (created.error && created.status !== 422) {
      // 422 = already exists; anything else we log and continue
      console.warn("admin.createUser warning", created.error);
    }

    // 4) Sign in and set cookies manually (no auth-helpers dependency)
    const pub = anon();
    const { data: signIn, error: signInErr } = await pub.auth.signInWithPassword({
      phone: phoneE164,
      password: deterministicPassword,
    });
    if (signInErr || !signIn?.session) {
      console.error("signInWithPassword error", signInErr);
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

    // 5) Ensure profile reflects real phone, NULL email
    await db.from("profiles")
      .upsert({ id: signIn.user.id, phone: phoneE164, email: null }, { onConflict: "id" });

    return NextResponse.json({ ok: true, next: "/onboard?src=join&step=welcome" });
  } catch (e: any) {
    console.error("verify route error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
