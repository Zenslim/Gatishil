/**
 * Local PIN fallback (no server). We derive a key from the 4-digit PIN using PBKDF2,
 * then encrypt a random device secret and store it in localStorage. PIN is never stored.
 */

const STORE_KEY = 'chautari.pin.v1';
const STORE_SALT = 'chautari.pin.salt.v1'; // OK to be public, improves derivation

function toBuf(b64: string) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}
function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function importKeyFromPin(pin: string, saltStr: string) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(saltStr), iterations: 120000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
}

export async function createLocalPin(pin: string) {
  if (!/^[0-9]{4}$/.test(pin)) throw new Error('PIN must be 4 digits');
  const key = await importKeyFromPin(pin, STORE_SALT);
  const deviceSecret = crypto.getRandomValues(new Uint8Array(32)); // 256-bit
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, deviceSecret);
  const payload = { iv: toB64(iv.buffer), ct: toB64(ct) };
  localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  return true;
}

export async function verifyLocalPin(pin: string) {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) throw new Error('No PIN set on this device');
  const { iv, ct } = JSON.parse(raw);
  const key = await importKeyFromPin(pin, STORE_SALT);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toBuf(iv) }, key, toBuf(ct));
  return plain.byteLength === 32; // valid
}

export function hasLocalPin() {
  return Boolean(localStorage.getItem(STORE_KEY));
}

export function removeLocalPin() {
  localStorage.removeItem(STORE_KEY);
}
