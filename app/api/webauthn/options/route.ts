import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

function toBufferSource(id: string): Uint8Array {
  return new TextEncoder().encode(id);
}

// Replace with your real current user fetch
function getCurrentUser(req: NextRequest) {
  const userId = "user-id-from-auth";
  return {
    id: userId,
    idBuffer: toBufferSource(userId),
    name: "user@example.com",
    displayName: "Gatishil Member",
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser(req);
    const rpID = "gatishilnepal.org";

    const options = await generateRegistrationOptions({
      rpName: "Gatishil Nepal",
      rpID,
      userID: user.idBuffer, // BufferSource required by simplewebauthn
      userName: user.name,
      userDisplayName: user.displayName,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    const res = NextResponse.json(options);
res.cookies.set("webauthn_challenge", options.challenge, {
  httpOnly: true,
  sameSite: "strict",
  secure: true,
  maxAge: 60 * 5,
  path: "/",
  domain: ".gatishilnepal.org", // 🔥 makes cookie valid for both www and apex
});

    return res;
  } catch (err) {
    console.error("webauthn/options error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
