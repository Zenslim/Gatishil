// app/api/webauthn/verify/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import {
  clearChallengeCookie,
  deriveRpID,
  expectedOrigins,
  extractRegistrationCredential,
  readChallengeCookie,
} from "../../../../lib/webauthn";

export async function POST(req: Request) {
  try {
    const host = req.headers.get("host");
    if (!host) {
      return NextResponse.json({ ok: false, error: "Missing Host header" }, { status: 400 });
    }
    const rpID = deriveRpID(host);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", detail: "Body must be JSON" },
        { status: 400 }
      );
    }

    const credential = extractRegistrationCredential(body);
    if (!credential) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          detail: "Missing WebAuthn credential (id, rawId, response, type)",
        },
        { status: 400 }
      );
    }

    // Dynamic import so module/runtime errors show up as JSON (not opaque 500)
    let verifyRegistrationResponse: any;
    try {
      const mod: any = await import("@simplewebauthn/server");
      verifyRegistrationResponse = mod.verifyRegistrationResponse || mod.default?.verifyRegistrationResponse;
      if (!verifyRegistrationResponse) throw new Error("verifyRegistrationResponse not found");
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: "ImportError: @simplewebauthn/server", detail: String(e?.message || e) },
        { status: 500 }
      );
    }

    // Read and validate challenge from cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const expectedChallenge = readChallengeCookie(cookieHeader);
    if (!expectedChallenge) {
      return NextResponse.json({ ok: false, error: "Missing or expired challenge" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      expectedChallenge,
      expectedOrigin: Array.from(expectedOrigins),
      expectedRPID: rpID,
      response: credential,
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json(
        {
          ok: false,
          error: "Verification failed",
          detail: verification.error || "@simplewebauthn/server returned verified=false",
        },
        { status: 400 }
      );
    }

    // Clear challenge cookie
    const res = NextResponse.json({ ok: true });
    clearChallengeCookie(res);
    return res;
  } catch (err: any) {
    console.error("[webauthn/verify] Verification failed", err);
    return NextResponse.json(
      { ok: false, error: "Verification failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
