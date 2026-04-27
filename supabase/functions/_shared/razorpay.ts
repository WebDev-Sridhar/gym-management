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

// Validate keys by attempting to create a real ₹1 order. This proves:
//   1. The key_id + key_secret are valid (would 401 otherwise)
//   2. The keys have orders:write permission (some restricted keys don't)
//   3. The mode (test vs live) is consistent — live keys reject test-mode requests
//
// Returns the test order so the caller can record it for audit. Razorpay does
// NOT charge for unpaid orders, so leaving this in their dashboard is harmless.
export async function validateKeysWithTestOrder(
  creds: RazorpayCreds,
): Promise<{ ok: boolean; reason?: string; testOrderId?: string }> {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(creds.keyId, creds.keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 100,                                  // ₹1 in paise
      currency: 'INR',
      receipt: `keytest_${Date.now()}`,
      notes: { purpose: 'gymos_key_validation' },
    }),
  })

  if (res.status === 401) {
    return { ok: false, reason: 'Invalid key ID or secret (401 from Razorpay)' }
  }

  if (res.status === 400) {
    const txt = await res.text()
    return { ok: false, reason: `Razorpay rejected the test order: ${txt}` }
  }

  if (!res.ok) {
    const txt = await res.text()
    return { ok: false, reason: `Razorpay returned ${res.status}: ${txt}` }
  }

  const order = await res.json()
  return { ok: true, testOrderId: order.id }
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
