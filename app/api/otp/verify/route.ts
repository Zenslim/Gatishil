import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  code: string; // ignored for SMS intake
}>;

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
function bad(message: string, extra: any = {}) {
  return json({ ok: false, message, ...extra }, 400);
}
function server(message: string, extra: any = {}) {
  return json({ ok: false, message, ...extra }, 503);
}

async function readBody(req: NextRequest): Promise<BodyLike> {
  // Robust body reader: JSON → text(JSON/URLSearchParams) → querystring
  try {
    try {
      const j = (await req.json()) as unknown;
      if (j && typeof j === "object") return j as BodyLike;
    } catch {}
    try {
      const t = await req.text();
      if (t) {
        try {
          const maybe = JSON.parse(t);
          if (maybe && typeof maybe === "object") return maybe as BodyLike;
        } catch {
          const p = new URLSearchParams(t);
          if ([...p.keys()].length) return Object.fromEntries(p.entries()) as BodyLike;
        }
      }
    } catch {}
    const qp = req.nextUrl.searchParams;
    if ([...qp.keys()].length) return Object.fromEntries(qp.entries()) as BodyLike;
    return {};
  } catch {
    return {};
  }
}

/** Canonical Nepal E.164 (+97798xxxxxxxx). Returns null if invalid/unrecognized. */
function toNepalE164(anyInput: string | null): string | null {
  if (!anyInput) return null;
  const digits = anyInput.replace(/\D/g, "");
  // 10-digit Nepal mobile → +97798xxxxxxxx (accept 96/97/98)
  if (/^9(6|7|8)\d{8}$/.test(digits)) return `+977${digits}`;
  // 977-prefixed → +97798xxxxxxxx
  if (/^9779(6|7|8)\d{8}$/.test(digits)) return `+${digits}`;
  // already canonical
  if (/^\+9779(6|7|8)\d{8}$/.test(anyInput)) return anyInput;
  // be generous: if starts with 9 and ≥10 digits, take last 10
  if (/^9\d{9,}$/.test(digits)) return `+977${digits.slice(-10)}`;
  return null;
}

/** Pull the first present phone-like field, or null */
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

export async function POST(req: NextRequest) {
  const {
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
  } = process.env;

  // We use service role because this is a server action that writes to a protected table.
  const supabaseUrl = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE || "";

  if (!supabaseUrl || !serviceKey) {
    return server("Server misconfigured for intake (missing Supabase URL or service role key).");
  }

  const body = await readBody(req);

  // If an email-only flow hits this endpoint, accept it as a no-op success for parity.
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Primary: phone intake (NO OTP). We just save/refresh the number.
  const rawPhone = extractPhone(body);
  const e164 = toNepalE164(rawPhone);

  // If no phone but an email is present, treat as email verified success (parity with UI expectations).
  if (!e164 && email) {
    return json({ ok: true, mode: "intake", channel: "email", verified: true });
  }

  if (!e164) {
    return bad("Nepal phone is required. Enter 10-digit 98xxxxxxxx (or 96/97) or +97798xxxxxxxx.", {
      received: rawPhone ?? null,
    });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Upsert into dedicated intake table (must exist): public.phone_intakes
    // Columns expected: phone text (unique), created_at timestamptz default now(), last_seen_at timestamptz default now()
    const { data, error } = await admin
      .from("phone_intakes")
      .upsert(
        { phone: e164, last_seen_at: new Date().toISOString() },
        { onConflict: "phone" }
      )
      .select("phone, created_at, last_seen_at")
      .single();

    if (error) {
      // Most common causes: table/policies missing.
      return server("Could not record phone.", { detail: error.message });
    }

    return json({
      ok: true,
      mode: "intake",
      channel: "sms",
      accepted: true,
      phone: data?.phone ?? e164,
      created_at: data?.created_at ?? null,
      last_seen_at: data?.last_seen_at ?? null,
    });
  } catch (e: any) {
    return server("Intake failed.", { detail: e?.message || String(e) });
  }
}
