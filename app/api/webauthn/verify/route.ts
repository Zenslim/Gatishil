import { NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";

// TODO: wire these to your real session/DB
async function getExpectedChallengeForUser(userId: string): Promise<string> {
  // Retrieve the challenge you saved during options generation
  // e.g., from a server session keyed by userId
  return "challenge-from-session";
}

// TODO: wire these to your real DB
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
    const body = (await req.json()) as RegistrationResponseJSON & { userId: string };
    const { userId, ...registrationResponse } = body;

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, reason: "missing-userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expectedChallenge = await getExpectedChallengeForUser(userId);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      // RP ID is the apex domain (no scheme/port)
      expectedRPID: "gatishilnepal.org",
      // Accept both apex and www to prevent origin mismatch
      expectedOrigins: [
        "https://gatishilnepal.org",
        "https://www.gatishilnepal.org",
      ],
      requireUserVerification: false,
    });

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return new Response(JSON.stringify({ ok: false, reason: "verification-failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Emit the *exact* reason to logs so we can diagnose quickly
    console.error("webauthn/verify 500:", err?.message || err, err?.stack);
    return new Response("Internal Server Error", { status: 500 });
  }
}
