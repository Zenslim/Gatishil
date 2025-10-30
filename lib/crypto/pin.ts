
import crypto from 'crypto';
import type { BinaryLike, ScryptOptions } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt) as unknown as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions & { N?: number; r?: number; p?: number },
) => Promise<Buffer>;

/** Base64url encode a Buffer. */
export function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Generate a random salt. */
export function genSalt(bytes = 16): Buffer {
  return crypto.randomBytes(bytes);
}

/**
 * Async derivation using scrypt with serverless-safe params: N=2^13, r=8, p=1.
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
  const N = 1 << 13; // 8192 (~8MiB)
  const r = 8;
  const p = 1;
  const out = (await scryptAsync(material, salt, length, { N, r, p })) as Buffer;
  return { derivedB64u: b64u(out) };
}

/**
 * Sync derivation variant for short tasks (same params).
 */
export function derivePasswordFromPinSync(opts: {
  pin: string;
  userId: string;
  saltB64: string;
  pepper: string;
  length?: number;
}): { derivedB64u: string } {
  const { pin, userId, saltB64, pepper, length = 32 } = opts;
  const salt = Buffer.from(saltB64, 'base64');
  const material = Buffer.from(`${pin}:${userId}:${pepper}`, 'utf8');
  const out = crypto.scryptSync(material, salt, length, { N: 1 << 13, r: 8, p: 1 }) as Buffer;
  return { derivedB64u: b64u(out) };
}
