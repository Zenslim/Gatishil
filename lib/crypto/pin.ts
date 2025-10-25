import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

/** Base64url encode a Buffer. */
function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Generate a random salt. */
export function genSalt(bytes = 16): Buffer {
  return crypto.randomBytes(bytes);
}

/**
 * Derive a strong password from PIN + user_id + salt + PEPPER using scrypt (async).
 * Tuned for serverless memory: N=2^13 (~8MB), r=8, p=1, length=32–48 bytes.
 */
export async function derivePasswordFromPin(opts: {
  pin: string;
  userId: string;
  salt: Buffer;
  pepper: string;
  length?: number; // bytes
}): Promise<{ derivedB64u: string }> {
  const { pin, userId, salt, pepper, length = 32 } = opts;
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  // ~8 MiB memory usage
  const N = 1 << 13; // 8192
  const r = 8;
  const p = 1;

  const out = (await scryptAsync(material, salt, length, { N, r, p })) as Buffer;
  return { derivedB64u: b64u(out) };
}
