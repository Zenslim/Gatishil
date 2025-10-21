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

/** Extract any phone-like field as string */
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

/** Canonicalize to +97798xxxxxxxx if possible */
function normalizeNepalE164(rawInput: string | null): string | null {
  if (!rawInput) return null;
  const raw = rawInput.replace(/\D/g, "");
  if (/^9(6|7|8)\d{8}$/.test(raw)) return `+977${raw}`;
  if (/^9779(6|7|8)\d{8}$/.test(raw)) return `+${raw}`;
  if (/^\+9779(6|7|8)\d{8}$/.test(rawInput)) return rawInput;
  return null;
}

/** Build all DB-match variants: +97798…, 97798…, 98… */
function allNepalVariants(e164: string): string[] {
  const digits = e164.replace(/\D/g, ""); // 97798xxxxxxxx
  const noPlus = digits;                   // 97798xxxxxxxx
  const ten = digits.slice(3);             // 98xxxxxxxx
  return [e164, noPlus, ten];
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  const {
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
    OTP_PEPPER, // may be undefined in older deploys
  } = process.env;

  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRole = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";

  if (!supabaseUrl || !serviceRole) {
    return server("Server misconfigured for verification.");
  }

  const body = await readBody(req);
  const codeInput = String((body.code || "")).trim();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawPhone = extractPhone(body);
  const e164 = normalizeNepalE164(rawPhone);

  if (!codeInput && !email) {
    return bad("Missing code or email.");
  }

  // Email path: handled by Supabase (magic link). Treat as success for parity.
  if (email && !e164) {
    return ok({ channel: "email", verified: true });
  }

  if (!e164) {
    return bad("Phone OTP is Nepal-only. Use 96/97/98… or +9779…");
  }

  const variants = allNepalVariants(e164); // [+97798…, 97798…, 98…]

  try {
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get latest OTP among all variants
    const { data, error } = await admin
      .from("otps")
      .select("id, phone, code, code_hash, expires_at, attempt_count, verified_at, consumed_at, created_at")
      .in("phone", variants)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return server("Lookup failed.", { detail: error.message, variants });

    const rec = Array.isArray(data) && data.length ? (data[0] as any) : null;
    if (!rec) return bad("No code found. Request a new one.", { variants });

    // Expiry check
    if (rec.expires_at && new Date(rec.expires_at).getTime() < Date.now()) {
      await admin.from("otps").update({ consumed_at: new Date().toISOString() }).eq("id", rec.id);
      return bad("Code expired. Request a new one.");
    }

    // Attempt limit
    const attempts = Number(rec.attempt_count ?? 0);
    if (attempts >= 5) return bad("Too many attempts. Request a new code.");

    // Tolerant matching:
    // 1) hash with pepper (current mode)
    const pepper = OTP_PEPPER || "";
    const hashWithPepper = sha256Hex(codeInput + pepper);
    // 2) hash without pepper (old mode)
    const hashNoPepper = sha256Hex(codeInput);
    // 3) plaintext fallback
    const plainMatch = rec.code && String(rec.code).trim() === codeInput;

    const match =
      (rec.code_hash && (rec.code_hash === hashWithPepper || rec.code_hash === hashNoPepper)) ||
      plainMatch;

    if (match) {
      await admin
        .from("otps")
        .update({
          verified_at: new Date().toISOString(),
          consumed_at: new Date().toISOString(),
          attempt_count: attempts + 1,
        })
        .eq("id", rec.id);

      return ok({ channel: "sms", verified: true, phone_variant: rec.phone });
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
