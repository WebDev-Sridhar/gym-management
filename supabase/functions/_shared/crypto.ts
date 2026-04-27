// AES-GCM encryption helper for per-gym payment secrets, with key versioning.
//
// Storage format (Uint8Array): [12-byte IV] [ciphertext+16-byte GCM tag]
// The version of the master key used is stored in a separate `encryption_version`
// column alongside the ciphertext. We never embed the version in the bytes themselves.
//
// Master keys are read from env:
//   PAYMENT_ENC_KEY_V1, PAYMENT_ENC_KEY_V2, ... (32-byte values, base64-encoded)
//
// Backward compat: if PAYMENT_ENC_KEY_V1 isn't set, falls back to PAYMENT_ENC_KEY.

// Bump this when you rotate. New encryptions use this version; decryptions use
// whatever version is recorded in the DB row.
export const CURRENT_ENC_VERSION = 1

const keyCache = new Map<number, CryptoKey>()

async function getKey(version: number): Promise<CryptoKey> {
  const cached = keyCache.get(version)
  if (cached) return cached

  const envName = `PAYMENT_ENC_KEY_V${version}`
  let b64 = Deno.env.get(envName)

  // Backward compat for v1 — if PAYMENT_ENC_KEY_V1 isn't set, accept the
  // unversioned PAYMENT_ENC_KEY name from the original deploy.
  if (!b64 && version === 1) {
    b64 = Deno.env.get('PAYMENT_ENC_KEY')
  }

  if (!b64) {
    throw new Error(`encryption key v${version} is not configured (set ${envName})`)
  }

  const raw = base64Decode(b64)
  if (raw.byteLength !== 32) {
    throw new Error(`${envName} must decode to 32 bytes (got ${raw.byteLength})`)
  }

  const key = await crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
  )
  keyCache.set(version, key)
  return key
}

export interface EncryptedPayload {
  version: number
  bytes: Uint8Array
}

// Always encrypts with CURRENT_ENC_VERSION. Caller must persist `version`
// alongside `bytes` (in the encryption_version column) so we can decrypt later.
export async function encryptSecret(plaintext: string): Promise<EncryptedPayload> {
  const key = await getKey(CURRENT_ENC_VERSION)
  const iv = crypto.getRandomValues(new Uint8Array(12))   // fresh IV every call — never reused
  const data = new TextEncoder().encode(plaintext)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  const out = new Uint8Array(iv.byteLength + ct.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(ct), iv.byteLength)
  return { version: CURRENT_ENC_VERSION, bytes: out }
}

// Decrypt with the version recorded in the DB.
export async function decryptSecret(version: number, payload: Uint8Array): Promise<string> {
  if (payload.byteLength < 13) throw new Error('ciphertext too short')
  const key = await getKey(version)
  const iv = payload.subarray(0, 12)
  const ct = payload.subarray(12)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

// Supabase delivers bytea columns as a hex string `\x...` when read via PostgREST.
export function byteaToBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (typeof value !== 'string') throw new Error('expected bytea string or Uint8Array')
  const hex = value.startsWith('\\x') ? value.slice(2) : value
  if (hex.length % 2 !== 0) throw new Error('invalid hex length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

// PostgREST accepts bytea on insert as a hex string with `\x` prefix.
export function bytesToBytea(bytes: Uint8Array): string {
  let hex = '\\x'
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64.trim())
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
