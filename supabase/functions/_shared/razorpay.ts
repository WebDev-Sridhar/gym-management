// Minimal Razorpay HTTP client. Key/secret are passed in per call so the
// same module works across many gyms (multi-tenant).

const BASE = 'https://api.razorpay.com/v1'

function authHeader(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`)
}

export interface RazorpayCreds {
  keyId: string
  keySecret: string
}

export interface CreateOrderParams {
  amount: number          // in paise
  currency?: string       // default 'INR'
  receipt?: string
  notes?: Record<string, string>
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: string
  receipt?: string
  notes?: Record<string, string>
}

export async function createOrder(
  creds: RazorpayCreds,
  params: CreateOrderParams,
): Promise<RazorpayOrder> {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(creds.keyId, creds.keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? 'INR',
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`razorpay createOrder failed (${res.status}): ${txt}`)
  }
  return res.json()
}

// Validate keys by making a cheap authenticated call.
// Returns true if the keys are accepted, false on 401, throws on other errors.
export async function validateKeys(creds: RazorpayCreds): Promise<boolean> {
  const res = await fetch(`${BASE}/payments?count=1`, {
    headers: { 'Authorization': authHeader(creds.keyId, creds.keySecret) },
  })
  if (res.status === 401) return false
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`razorpay validateKeys unexpected status ${res.status}: ${txt}`)
  }
  return true
}

// HMAC-SHA256(message, secret) → hex string. Used for both checkout signature
// verification (`order_id|payment_id`) and webhook signature verification (raw body).
export async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(sig)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// Constant-time string equality to prevent timing attacks on signature comparison.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
