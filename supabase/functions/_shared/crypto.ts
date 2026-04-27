// AES-GCM encryption helper for per-gym payment secrets.
//
// Storage format (Uint8Array): [12-byte IV] [ciphertext+16-byte GCM tag]
// Master key is read once from PAYMENT_ENC_KEY (base64 of a 32-byte value).

const KEY_ENV = 'PAYMENT_ENC_KEY'
let cachedKey: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const b64 = Deno.env.get(KEY_ENV)
  if (!b64) {
    throw new Error(`${KEY_ENV} is not set in edge function secrets`)
  }

  const raw = base64Decode(b64)
  if (raw.byteLength !== 32) {
    throw new Error(`${KEY_ENV} must decode to 32 bytes (got ${raw.byteLength})`)
  }

  cachedKey = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
  return cachedKey
}

export async function encryptSecret(plaintext: string): Promise<Uint8Array> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(plaintext)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  const out = new Uint8Array(iv.byteLength + ct.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(ct), iv.byteLength)
  return out
}

export async function decryptSecret(payload: Uint8Array): Promise<string> {
  if (payload.byteLength < 13) {
    throw new Error('ciphertext too short')
  }
  const key = await getKey()
  const iv = payload.subarray(0, 12)
  const ct = payload.subarray(12)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

// Supabase delivers bytea columns as a hex string `\x...` when read via PostgREST.
// Convert that to a Uint8Array we can decrypt.
export function byteaToBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (typeof value !== 'string') {
    throw new Error('expected bytea string or Uint8Array')
  }
  const hex = value.startsWith('\\x') ? value.slice(2) : value
  if (hex.length % 2 !== 0) throw new Error('invalid hex length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return out
}

// PostgREST accepts bytea on insert as a hex string with `\x` prefix.
export function bytesToBytea(bytes: Uint8Array): string {
  let hex = '\\x'
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64.trim())
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
