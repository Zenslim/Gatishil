// lib/localPin.ts
// Device-local 4-digit PIN storage & verification (never sent to server).
const STORAGE_KEY = 'gn.pin.v1';
const ITERATIONS = 120000; // ~100-150k recommended for PBKDF2 on web
const DIGITS_RE = /^\d{4}$/: RegExp;

export type StoredPin = {
  deviceId: string;
  pinHash: string; // base64
  salt: string;    // base64
  createdAt: string;
};

function toBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromString(s: string) { return new TextEncoder().encode(s); }

async function pbkdf2(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', fromString(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256
  );
  return toBase64(bits);
}

export async function setPin(deviceId: string, pin: string) {
  if (!DIGITS_RE.test(pin)) throw new Error('PIN must be 4 digits');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pinHash = await pbkdf2(pin, salt);
  const payload: StoredPin = {
    deviceId,
    pinHash,
    salt: toBase64(salt.buffer),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return true;
}

export async function hasPin(): Promise<boolean> {
  return !!localStorage.getItem(STORAGE_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const data: StoredPin = JSON.parse(raw);
  const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0));
  const hash = await pbkdf2(pin, salt);
  return hash === data.pinHash;
}

export function clearPin() {
  localStorage.removeItem(STORAGE_KEY);
}
