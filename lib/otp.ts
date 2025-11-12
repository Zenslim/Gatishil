import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient, createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Unified OTP (Email + Phone/SMS) for Next.js App Router.
 * Single source of truth. No duplication.
 * Requirements:
 * - Env on Vercel: SUPABASE_URL, SUPABASE_ANON_KEY (server), NEXT_PUBLIC_SITE_URL
 * - Supabase Auth: Phone confirmations ON, SMS Hook (HTTPS) configured
 */

type SendPayload =
  | { email: string; type?: "otp" | "magiclink"; redirectTo?: string }
  | { phone: string };

type VerifyPayload =
  | { email: string; token: string }
  | { phone: string; token: string };

const NEPAL_PREFIX = "+977";
type CookieStore = ReturnType<typeof cookies>;

function isEmailSend(p: any): p is { email: string; type?: "otp" | "magiclink"; redirectTo?: string } {
  return typeof p?.email === "string" && p.email.includes("@");
}
function isPhoneSend(p: any): p is { phone: string } {
  return typeof p?.phone === "string";
}
function isEmailVerify(p: any): p is { email: string; token: string } {
  return typeof p?.email === "string" && typeof p?.token === "string";
}
function isPhoneVerify(p: any): p is { phone: string; token: string } {
  return typeof p?.phone === "string" && typeof p?.token === "string";
}

export async function handleSend(req: Request): Promise<Response> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
  } as any);

  let body: SendPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // EMAIL
  if (isEmailSend(body)) {
    const email = body.email.trim().toLowerCase();
    if (!email) return json({ error: "bad_request", detail: "email required" }, 400);

    const redirectTo = body.redirectTo || process.env.NEXT_PUBLIC_SITE_URL || undefined;
    const mode = body.type || "otp"; // "otp" (6-digit) or "magiclink"

    if (mode === "magiclink") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (error) return json({ error: "supabase_error", detail: error.message }, 400);
      return json({ ok: true, channel: "email", mode: "magiclink" });
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) return json({ error: "supabase_error", detail: error.message }, 400);
      return json({ ok: true, channel: "email", mode: "otp" });
    }
  }

  // PHONE
  if (isPhoneSend(body)) {
    const phone = body.phone.trim();
    if (!phone.startsWith(NEPAL_PREFIX)) {
      return json({ error: "nepal_only", detail: "Phone OTP is Nepal-only (+977)." }, 422);
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true, channel: "sms" },
    });
    if (error) return json({ error: "supabase_error", detail: error.message }, 400);
    return json({ ok: true, channel: "phone", mode: "sms" });
  }

  return json({ error: "bad_request", detail: "Provide {email} or {phone}" }, 400);
}

export async function handleVerify(req: Request): Promise<Response> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
  } as any);

  let body: VerifyPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // EMAIL VERIFY (6-digit OTP flow)
  if (isEmailVerify(body)) {
    const email = body.email.trim().toLowerCase();
    const token = body.token.trim();
    if (!email || !token) return json({ error: "bad_request", detail: "email and token required" }, 400);
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return json({ error: "verify_failed", detail: error.message }, 400);
    if (!data?.session) {
      return json({ error: "verify_failed", detail: "No session returned from Supabase." }, 400);
    }
    return await respondWithServerCommit(data.session, cookieStore);
  }

  // PHONE VERIFY
  if (isPhoneVerify(body)) {
    const phone = body.phone.trim();
    const token = body.token.trim();
    if (!phone || !token) return json({ error: "bad_request", detail: "phone and token required" }, 400);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) return json({ error: "verify_failed", detail: error.message }, 400);
    if (!data?.session) {
      return json({ error: "verify_failed", detail: "No session returned from Supabase." }, 400);
    }
    return await respondWithServerCommit(data.session, cookieStore);
  }

  return json({ error: "bad_request", detail: "Provide {email, token} or {phone, token}" }, 400);
}

export function json(payload: any, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function respondWithServerCommit(session: Session, cookieStore: CookieStore): Promise<NextResponse> {
  const response = json({ ok: true, serverCommitted: true });
  await attachSessionCookies(response, session, cookieStore);
  return response;
}

async function attachSessionCookies(response: NextResponse, session: Session, cookieStore: CookieStore) {
  if (!session?.access_token) return;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    });

    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? undefined,
    });
  } catch (error) {
    console.error("[otp/attachSessionCookies] Failed to persist session cookies", error);
  }
}
