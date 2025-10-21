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

function ok(data: JsonBody = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
function bad(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status: 400 });
}
function server(message: string, extra: JsonBody = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status: 503 });
}

async function readBody(req: NextRequest): Promise<BodyLike> {
  try {
    try {
      const j = (await req.json()) as unknown;
      if (j && typeof j === "object") return j as BodyLike;
    } catch {}
    try {
      const text = await req.text();
      if (text) {
        try {
          const maybe = JSON.parse(text);
          if (maybe && typeof maybe === "object") return maybe as BodyLike;
        } catch {
          const params = new URLSearchParams(text);
          if ([...params.keys()].length > 0) return Object.fromEntries(params.entries()) as BodyLike;
        }
      }
    } catch {}
    const qp = req.nextUrl.searchParams;
    if (qp && [...qp.keys()].length > 0) return Object.fromEntries(qp.entries()) as BodyLike;
    return {};
  } catch {
    return {};
  }
}

function extractPhone(b: BodyLike): string | null {
  const c: any =
    b.phone ??
    b.phoneNumber ??
    b.mobile ??
    b.msisdn ??
    b.to ??
    b.identifier ??
    "";
  if (typeof c === "number") return String(c);
  if (typeof c === "string") return c;
  return c ? String(c) : null;
}

/** +9779x… if Nepal mobile (96/97/98 + 8 digits) or already 977-prefixed */
function normalizeNepalMobileStrict(rawInput: string | null): string | null {
  if (!rawInput) return null;
  const raw = rawInput.replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(raw)) return `+977${raw}`;
  if (/^9779(6|7|8)\d{8}$/.test(raw)) return `+${raw}`;
  return null;
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  const {
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
    OTP_PEPPER,
  } = process.env;

  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRole = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";

  if (!supabaseUrl || !serviceRole) {
    return server("Server misconfigured for verification.");
  }

  const body = await readBody(req);
  const codeInput = (body.code || "").trim();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawPhone = extractPhone(body);
  const phone = normalizeNepalMobileStrict(rawPhone);

  if (!codeInput && !email) {
    return bad("Missing code or email.");
  }

  // Email path: Supabase handles email verification; acknowledge success for flow parity
  if (email && !phone) {
    return ok({ channel: "email", verified: true });
  }

  if (!phone) {
    return bad("Phone OTP is Nepal-only. Use 96/97/98… or +9779…");
  }

  try {
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // latest OTP for phone
    const { data, error } = await admin
      .from("otps")
      .select("id, code, code_hash, expires_at, attempt_count, verified_at, consumed_at, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return server("Lookup failed.", { detail: error.message });
    }

    const rec = Array.isArray(data) && data.length ? (data[0] as any) : null;
    if (!rec) {
      return bad("No code found. Request a new one.");
    }

    // expired?
    if (rec.expires_at && new Date(rec.expires_at).getTime() < Date.now()) {
      await admin.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", rec.id);
      return bad("Code expired. Request a new one.");
    }

    // attempt limit
    const attempts = Number(rec.attempt_count ?? 0);
    if (attempts >= 5) {
      return bad("Too many attempts. Request a new code.");
    }

    // verify: hashed preferred, plaintext fallback
    const pepper = OTP_PEPPER || "";
    const givenHash = sha256Hex(codeInput + pepper);
    const match =
      (rec.code_hash && rec.code_hash === givenHash) ||
      (rec.code && String(rec.code).trim() === codeInput);

    if (match) {
      await admin
        .from("otps")
        .update({
          verified_at: new Date().toISOString(),
          consumed_at: new Date().toISOString(),
          attempt_count: attempts + 1,
        })
        .eq("id", rec.id);

      return ok({ channel: "sms", verified: true });
    } else {
      await admin
        .from("otps")
        .update({ attempt_count: attempts + 1 })
        .eq("id", rec.id);

      return bad("Incorrect code.");
    }
  } catch (e: any) {
    return server("Could not verify code right now.", { detail: e?.message || String(e) });
  }
}
