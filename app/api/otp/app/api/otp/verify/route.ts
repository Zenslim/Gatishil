import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BodyLike = Partial<{
  phone: string;
  phoneNumber: string;
  mobile: string;
  msisdn: string;
  to: string;
  identifier: string;
  email: string;
  code: string;
}>;

type JsonBody = Record<string, unknown>;

function ok(data: JsonBody = {}) { return NextResponse.json({ ok: true, ...data }, { status: 200 }); }
function bad(message: string, extra: JsonBody = {}) { return NextResponse.json({ ok: false, message, ...extra }, { status: 400 }); }
function server(message: string, extra: JsonBody = {}) { return NextResponse.json({ ok: false, message, ...extra }, { status: 503 }); }

async function readBody(req: NextRequest): Promise<BodyLike> {
  try {
    try { const j = await req.json(); if (j && typeof j === "object") return j as BodyLike; } catch {}
    try {
      const text = await req.text();
      if (text) {
        try { const maybe = JSON.parse(text); if (maybe && typeof maybe === "object") return maybe as BodyLike; }
        catch { const p = new URLSearchParams(text); if ([...p.keys()].length) return Object.fromEntries(p.entries()) as BodyLike; }
      }
    } catch {}
    const qp = req.nextUrl.searchParams; if (qp && [...qp.keys()].length) return Object.fromEntries(qp.entries()) as BodyLike;
    return {};
  } catch { return {}; }
}

/** Canonical Nepal E.164 (+97798xxxxxxxx). Returns null if invalid. */
function toNepalE164(anyInput: string | null): string | null {
  if (!anyInput) return null;
  const digits = anyInput.replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(digits)) return `+977${digits}`;
  if (/^9779(6|7|8)\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+9779(6|7|8)\d{8}$/.test(anyInput)) return anyInput;
  return null;
}

function sha256Hex(s: string) { return crypto.createHash("sha256").update(s, "utf8").digest("hex"); }

export async function POST(req: NextRequest) {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE, OTP_PEPPER } = process.env;
  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";
  if (!supabaseUrl || !serviceKey) return server("Server misconfigured for verification.");

  const body = await readBody(req);
  const codeInput = String((body.code || "")).trim();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const e164 = toNepalE164(String(body.phone ?? body.phoneNumber ?? body.mobile ?? body.msisdn ?? body.to ?? body.identifier ?? ""));

  if (!codeInput && !email) return bad("Missing code or email.");
  if (email && !e164) return ok({ channel: "email", verified: true }); // email handled elsewhere
  if (!e164) return bad("Phone OTP is Nepal-only. Enter 10‑digit 98xxxxxxxx or +97798xxxxxxxx.");

  try {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data, error } = await admin
      .from("otps")
      .select("id, phone, code, code_hash, expires_at, attempt_count, created_at")
      .eq("phone", e164)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return server("Lookup failed.", { detail: error.message });

    const rec = Array.isArray(data) && data.length ? (data[0] as any) : null;
    if (!rec) return bad("No code found. Request a new one.");

    if (rec.expires_at && new Date(rec.expires_at).getTime() < Date.now()) {
      await admin.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", rec.id);
      return bad("Code expired. Request a new one.");
    }

    const attempts = Number(rec.attempt_count ?? 0);
    if (attempts >= 5) return bad("Too many attempts. Request a new code.");

    const pepper = OTP_PEPPER || "";
    const hashWithPepper = sha256Hex(codeInput + pepper);
    const hashNoPepper = sha256Hex(codeInput);
    const plainMatch = !!rec.code && String(rec.code).trim() === codeInput;
    const match = (!!rec.code_hash && (rec.code_hash === hashWithPepper || rec.code_hash === hashNoPepper)) || plainMatch;

    if (!match) {
      await admin.from("otps").update({ attempt_count: attempts + 1 }).eq("id", rec.id);
      return bad("Incorrect code.");
    }

    await admin.from("otps").update({ verified_at: new Date().toISOString(), consumed_at: new Date().toISOString(), attempt_count: attempts + 1 }).eq("id", rec.id);
    return ok({ channel: "sms", verified: true });
  } catch (e: any) {
    return server("Could not verify code right now.", { detail: e?.message || String(e) });
  }
}
