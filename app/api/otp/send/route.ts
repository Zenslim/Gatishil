import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────────────────
// Reuse your existing supabase admin + server conventions.
// If you already expose an admin client at lib/supabase/admin.ts,
// import it instead of the inline createAdmin() below.
// e.g.  import { admin } from "@/lib/supabase/admin";
// ───────────────────────────────────────────────────────────

function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonForEmailOnly() {
  // Use anon key for email OTP/magic link
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

// Nepal-only E.164 validation: +977 followed by 9–10 digits
const NEPAL_E164 = /^\+977\d{9,10}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { phone, email, redirectTo } = body ?? {};

    // ───────────────────────────────────────────────────────
    // 1) PHONE PATH (Nepal-only) — store-only, NO OTP.
    //    This completely avoids /auth/v1/verify and 403s.
    // ───────────────────────────────────────────────────────
    if (typeof phone === "string") {
      if (!NEPAL_E164.test(phone)) {
        return NextResponse.json(
          {
            ok: false,
            field: "phone",
            error: "INVALID_PHONE",
            message: "Use a Nepali number in +977XXXXXXXXXX format.",
          },
          { status: 400 }
        );
      }

      const admin = createAdmin();

      // Ensure table exists in your DB (run SQL once, see note below).
      // Upsert by e164_phone to keep first_seen_at stable.
      const now = new Date().toISOString();
      const ip =
        (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        null;
      const userAgent = req.headers.get("user-agent") || null;

      const { error: upsertErr } = await admin
        .from("phone_contacts")
        .upsert(
          {
            e164_phone: phone,
            country_code: "NP",
            last_seen_at: now,
            attempts: 1,
          },
          { onConflict: "e164_phone" }
        );

      if (upsertErr) {
        return NextResponse.json(
          { ok: false, error: "DB_ERROR", message: upsertErr.message },
          { status: 500 }
        );
      }

      // Best-effort event log
      await admin.from("phone_contact_events").insert({
        e164_phone: phone,
        event_type: "store",
        ip_addr: ip,
        user_agent: userAgent,
      });

      // Send the app forward without OTP
      return NextResponse.json(
        {
          ok: true,
          mode: "phone_stored",
          next: "/onboard?src=join&phoneSaved=1",
        },
        { status: 201 }
      );
    }

    // ───────────────────────────────────────────────────────
    // 2) EMAIL PATH — keep your normal Supabase OTP/magic link
    // ───────────────────────────────────────────────────────
    if (typeof email === "string" && email.includes("@")) {
      const supabase = createAnonForEmailOnly();
      const emailRedirectTo =
        typeof redirectTo === "string" && redirectTo.length > 0
          ? redirectTo
          : `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/onboard?src=join`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            field: "email",
            error: "EMAIL_OTP_SEND_FAILED",
            message: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          mode: "email_otp_sent",
          message: "We sent a 6-digit code / magic link to your email.",
        },
        { status: 200 }
      );
    }

    // Neither phone nor email provided
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        message: "Provide either { phone } or { email }.",
      },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED", message: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
