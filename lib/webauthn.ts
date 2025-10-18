// lib/webauthn.ts
import type { NextResponse } from "next/server";

export const rpName = "Gatishil Nepal — Chauṭarī";

export const expectedOrigins = new Set([
  "https://gatishilnepal.org",
  "https://www.gatishilnepal.org",
] as const);

export const WEB_AUTHN_CHALLENGE_COOKIE = "webauthn_challenge";

const CHALLENGE_COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
});

/** Derive RPID (normalize www → apex). */
export function deriveRpID(hostHeader: string | null): string {
  if (!hostHeader) return "gatishilnepal.org";
  const host = hostHeader.split(":")[0].toLowerCase();
  if (host.endsWith(".gatishilnepal.org") || host === "gatishilnepal.org") {
    return "gatishilnepal.org";
  }
  return host;
}

export function toBase64Url(input: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof input === "string") {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  const view = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return Buffer.from(view).toString("base64url");
}

export function readChallengeCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${WEB_AUTHN_CHALLENGE_COOKIE}=([^;]+)`) // eslint-disable-line prefer-regex-literals
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setChallengeCookie(res: NextResponse, challenge: string) {
  res.cookies.set(WEB_AUTHN_CHALLENGE_COOKIE, challenge, CHALLENGE_COOKIE_OPTIONS);
}

export function clearChallengeCookie(res: NextResponse) {
  res.cookies.set(WEB_AUTHN_CHALLENGE_COOKIE, "", { ...CHALLENGE_COOKIE_OPTIONS, maxAge: 0 });
}

type LooseRecord = Record<string, unknown>;

export interface RegistrationCredentialJSON {
  id: string;
  rawId: string;
  type: string;
  response: LooseRecord;
  clientExtensionResults?: LooseRecord;
  transports?: string[];
  authenticatorAttachment?: string;
}

/**
 * Normalize the credential payload sent by the browser.
 * Handles both `{ credential }` and `{ response }` shapes as well as raw payloads.
 */
export function extractRegistrationCredential(payload: unknown): RegistrationCredentialJSON | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = (payload as LooseRecord).credential ?? (payload as LooseRecord).response ?? payload;
  if (!candidate || typeof candidate !== "object") return null;

  const { id, rawId, type, response } = candidate as LooseRecord;
  if (typeof id !== "string" || typeof rawId !== "string" || typeof type !== "string") return null;
  if (!response || typeof response !== "object") return null;

  return {
    ...(candidate as LooseRecord),
    id,
    rawId,
    type,
    response: response as LooseRecord,
  };
}
