// app/api/otp/verify/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NEPAL_E164 = /^\+977\d{9,10}$/;
const sha256Hex = (s:string)=>crypto.createHash("sha256").update(s).digest("hex");
const EXPIRY_GRACE_MS = 2*60*1000; // slight clock skew tolerance

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=>({} as any));
    const { phone, code, email, token, type } = body || {};

    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const SEED = process.env.SERVER_PHONE_PASSWORD_SEED || "";

    // PHONE: verify against public.otps (Custom SoT), then mint Supabase session
    if (typeof phone === "string" && typeof code === "string") {
      if (!NEPAL_E164.test(phone)) return NextResponse.json({ ok:false, error:"INVALID_PHONE" }, { status:400 });
      if (code.trim().length !== 6) return NextResponse.json({ ok:false, error:"INVALID_CODE" }, { status:400 });
      if (!URL || !ANON || !SERVICE || !SEED) return NextResponse.json({ ok:false, error:"SERVER_MISCONFIG" }, { status:500 });

      const admin = createClient(URL, SERVICE, { auth:{ autoRefreshToken:false, persistSession:false } });
      const anon = createClient(URL, ANON, { auth:{ persistSession:false } });

      // Fetch latest unused OTP for this phone
      const { data: row, error: selErr } = await admin
        .from("otps")
        .select("id, code_hash, expires_at, attempt_count, used_at, verified_at")
        .eq("phone", phone)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selErr || !row) {
        return NextResponse.json({ ok:false, error:"NO_OTP", message:"No active code. Request a new one." }, { status:400 });
      }

      const now = Date.now();
      const exp = new Date(row.expires_at).getTime();
      if (exp + EXPIRY_GRACE_MS < now) {
        return NextResponse.json({ ok:false, error:"OTP_EXPIRED" }, { status:401 });
      }

      const match = sha256Hex(code.trim()) === row.code_hash;

      // increment attempt_count
      await admin.from("otps").update({ attempt_count: (row.attempt_count || 0) + 1 }).eq("id", row.id);

      if (!match) {
        return NextResponse.json({ ok:false, error:"BAD_CODE" }, { status:401 });
      }

      // mark used/verified
      const usedAtIso = new Date().toISOString();
      await admin.from("otps").update({ used_at: usedAtIso, verified_at: usedAtIso }).eq("id", row.id);

      // Ensure user exists & is phone-confirmed; derive server-only password
      const password = sha256Hex(`${SEED}:${phone}`).slice(0, 32);
      let userId: string | null = null;
      const created = await admin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        password,
        user_metadata: { signup_method: "phone_custom_otp" },
      });
      if (created.data?.user?.id) {
        userId = created.data.user.id;
      } else {
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list.data?.users?.find((u: any) => u.phone === phone);
        if (found) {
          userId = found.id;
          await admin.auth.admin.updateUserById(userId, { phone, phone_confirm: true, password });
        }
      }
      if (!userId) return NextResponse.json({ ok:false, error:"USER_NOT_FOUND_OR_CREATED" }, { status:500 });

      const sign = await anon.auth.signInWithPassword({ phone, password });
      if (sign.error || !sign.data?.session) {
        return NextResponse.json({ ok:false, error:"SIGNIN_FAILED", message: sign.error?.message }, { status:500 });
      }

      const s = sign.data.session;
      return NextResponse.json(
        { ok:true, access_token:s.access_token, refresh_token:s.refresh_token, token_type:s.token_type, expires_in:s.expires_in, next:"/onboard?src=otp" },
        { status:200 }
      );
    }

    // EMAIL: leave as-is (Supabase SoT). If you verify email here, keep it; else ignore.
    if (typeof email === "string" && typeof token === "string") {
      if (!URL || !ANON) return NextResponse.json({ ok:false, error:"SERVER_MISCONFIG" }, { status:500 });
      const sb = createClient(URL, ANON, { auth: { persistSession: false } });
      const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: (type as any) ?? "email" });
      if (error) return NextResponse.json({ ok:false, error:"EMAIL_OTP_VERIFY_FAILED", message:error.message }, { status:401 });
      const session = data?.session ?? (await sb.auth.getSession()).data.session ?? null;
      if (!session?.access_token) return NextResponse.json({ ok:false, error:"SESSION_MISSING" }, { status:500 });
      return NextResponse.json(
        { ok:true, access_token:session.access_token, refresh_token:session.refresh_token, token_type:session.token_type, expires_in:session.expires_in, next:"/onboard?src=otp" },
        { status:200 }
      );
    }

    return NextResponse.json({ ok:false, error:"BAD_REQUEST", message:"Provide { phone, code } or { email, token }." }, { status:400 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:"UNEXPECTED", message: e?.message || "Unexpected error" }, { status:500 });
  }
}
