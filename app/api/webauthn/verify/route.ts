import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";

// Replace with your real DB save
async function saveCredential(userId: string, data: {
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
}) {
  console.log("Persist credential for", userId, data.credentialID);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegistrationResponseJSON & { userId?: string };
    const userId = body.user?.id as unknown as string || body["userId"] || "user-id-from-auth";

    const cookieStore = cookies();
    const expectedChallenge = cookieStore.get("webauthn_challenge")?.value;
    if (!expectedChallenge) {
      return NextResponse.json({ ok: false, reason: "missing-challenge" }, { status: 400 });
    }

    // Clear to prevent replay
    cookieStore.set("webauthn_challenge", "", { maxAge: 0, path: "/" });

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedRPID: "gatishilnepal.org",
      expectedOrigins: ["https://gatishilnepal.org", "https://www.gatishilnepal.org"],
      requireUserVerification: false,
    });

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return NextResponse.json({ ok: false, reason: "verification-failed" }, { status: 400 });
    }

    const {
      credentialPublicKey,
      credentialID,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    await saveCredential(userId, {
      credentialID: Buffer.from(credentialID).toString("base64url"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64url"),
      counter,
      credentialDeviceType,
      credentialBackedUp,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("webauthn/verify 500:", err?.message || err, err?.stack);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
