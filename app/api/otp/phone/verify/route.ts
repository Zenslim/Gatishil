import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || (process.env.SUPABASE_ANON_KEY as string);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const SERVER_PHONE_PASSWORD_SEED = process.env.SERVER_PHONE_PASSWORD_SEED as string;

const anon = () => createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
const admin = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const j = (status: number, body: unknown) => NextResponse.json(body, { status });
const NEPAL_E164 = /^\+9779[78]\d{8}$/;
const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

function toLocal(msisdn: string): string | null {
  if (!NEPAL_E164.test(msisdn)) return null;
  const local = msisdn.replace(/^\+977/, "");
  return /^9[78]\d{8}$/.test(local) ? local : null;
}
const aliasEmail = (local: string) => `p${local}@gn.local`;
const passwordFor = (local: string) => sha256Hex(`${SERVER_PHONE_PASSWORD_SEED}:${local}`).slice(0, 32);

type Payload = { phone?: string; code?: string };

export async function POST(req: NextRequest) {
  let body: Payload = {};
  try { body = (await req.json()) as Payload; } catch { return j(400, { ok: false, error: "BAD_JSON" }); }

  const phone = (body.phone || "").trim();
  const code = (body.code || "").trim();
  if (!phone || !code) return j(400, { ok: false, error: "PHONE_AND_CODE_REQUIRED" });

  const local = toLocal(phone);
  if (!local) return j(400, { ok: false, error: "INVALID_NEPAL_NUMBER" });

  const code_hash = sha256Hex(code);
  const supaAdmin = admin();
  const { data: otp, error: selErr } = await supaAdmin.from("otps").select("id, code_hash, expires_at, used_at").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (selErr) return j(400, { ok: false, error: "OTP_FETCH_FAILED", detail: selErr.message });
  if (!otp) return j(400, { ok: false, error: "OTP_NOT_FOUND" });
  if (otp.used_at) return j(400, { ok: false, error: "OTP_ALREADY_USED" });
  if (new Date(otp.expires_at).getTime() < Date.now()) return j(400, { ok: false, error: "OTP_EXPIRED" });
  if (otp.code_hash !== code_hash) return j(400, { ok: false, error: "OTP_MISMATCH" });

  const { error: updErr } = await supaAdmin.from("otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);
  if (updErr) return j(400, { ok: false, error: "OTP_CONSUME_FAILED", detail: updErr.message });

  const email = aliasEmail(local);
  const password = passwordFor(local);

  const { data: existing } = await supaAdmin.auth.admin.listUsers({ page: 1, perPage: 1, email });
  let userId: string | null = null;
  if (existing && existing.users && existing.users.length > 0 && existing.users[0].email === email) {
    userId = existing.users[0].id;
  } else {
    const { data: created, error: createErr } = await supaAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { provider: "phone-otp", local_phone: local },
      user_metadata: { phone_e164: phone },
    } as any);
    if (createErr) return j(400, { ok: false, error: "USER_CREATE_FAILED", detail: createErr.message });
    userId = created?.user?.id ?? null;
  }

  const supaAnon = anon();
  const { data: session, error: signErr } = await supaAnon.auth.signInWithPassword({ email, password });
  if (signErr) return j(400, { ok: false, error: "SESSION_CREATE_FAILED", detail: signErr.message });

  return j(200, { ok: true, provider: "phone", user_id: userId, session });
}
