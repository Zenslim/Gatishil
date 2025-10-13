// app/api/webauthn/options/route.ts
export const runtime = "nodejs";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import {
  deriveRpID,
  expectedOrigins,
  rpName,
  setChallengeCookie,
  toBase64Url,
} from "../../../../lib/webauthn";

export async function POST(req: Request) {
  try {
    const host = req.headers.get("host");
    if (!host) {
      return NextResponse.json({ ok: false, error: "Missing Host header" }, { status: 400 });
    }
    const rpID = deriveRpID(host);

      const body = await req.json().catch(() => ({} as any));
      const rawUserId =
        typeof body.userId === "string" && body.userId.trim()
          ? body.userId
          : String(body.userId || "temp-user");
      const userId = toBase64Url(rawUserId);
      const userName = String(body.userName || body.username || "Chautari Member");

      const challenge = toBase64Url(randomBytes(32));

      const payload = {
        rp: {
          name: rpName,
          id: rpID,
        },
        user: {
          id: userId,
          name: userName,
          displayName: userName,
        },
        challenge,
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        attestation: "none" as const,
        authenticatorSelection: {
          residentKey: "preferred" as const,
          userVerification: "preferred" as const,
          authenticatorAttachment: "platform" as const,
        },
        timeout: 60_000,
        expectedOrigins: Array.from(expectedOrigins),
      };

    const res = NextResponse.json(payload);
    // Store short-lived challenge in httpOnly cookie
    setChallengeCookie(res, challenge);
    return res;
  } catch (err: any) {
    console.error("[webauthn/options] Failed to create options", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create options", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
