import crypto from 'crypto';

/**
 * Base64url encode a Buffer.
 */
function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Generate a random salt.
 */
export function genSalt(bytes = 16): Buffer {
  return crypto.randomBytes(bytes);
}

/**
 * Derive a strong password from PIN + user_id + salt + PEPPER using scrypt.
 * We intentionally include the user_id to bind the derivation per account.
 */
export function derivePasswordFromPin(opts: {
  pin: string;
  userId: string;
  salt: Buffer;
  pepper: string;
  length?: number; // bytes
}): { derivedB64u: string } {
  const { pin, userId, salt, pepper, length = 48 } = opts;
  // material = PIN || user_id || PEPPER (salt is provided to scrypt)
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const out = crypto.scryptSync(material, salt, length, { N: 1 << 15, r: 8, p: 1 }) as Buffer;
  return { derivedB64u: b64u(out) };
}
