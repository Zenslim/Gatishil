// lib/localPin.ts
const STORE_KEY = 'gn.local.secret'
const SALT_KEY = 'gn.local.salt'

function getSubtle() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) throw new Error('Crypto not available')
  return window.crypto.subtle
}

async function deriveKey(pin: string, salt: Uint8Array) {
  const enc = new TextEncoder()
  const keyMaterial = await getSubtle().importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey'])
  return getSubtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function hasLocalPin(): boolean {
  if (typeof localStorage === 'undefined') return false
  return !!localStorage.getItem(STORE_KEY)
}

export async function createLocalPin(pin: string) {
  const secret = crypto.getRandomValues(new Uint8Array(32))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pin, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await getSubtle().encrypt({ name: 'AES-GCM', iv }, key, secret)
  localStorage.setItem(STORE_KEY, JSON.stringify({ iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }))
  localStorage.setItem(SALT_KEY, JSON.stringify({ salt: Array.from(salt) }))
}

export async function unlockWithPin(pin: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const saltRaw = localStorage.getItem(SALT_KEY)
    if (!raw || !saltRaw) return false
    const { iv, ct } = JSON.parse(raw)
    const { salt } = JSON.parse(saltRaw)
    const key = await deriveKey(pin, new Uint8Array(salt))
    const pt = await getSubtle().decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(ct))
    return pt.byteLength === 32
  } catch {
    return false
  }
}
