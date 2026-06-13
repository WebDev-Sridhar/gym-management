// POST /functions/v1/interakt-webhook
//
// Captures inbound STOP / opt-out messages from Interakt's WhatsApp webhook
// and flips members.unsubscribed=true for the sender phone across every
// gym they belong to. The notification engine
// (_shared/notifications.ts:254) then short-circuits future dispatches and
// logs them as 'skipped' with metadata.suppressed_reason='member_unsubscribed'.
//
// SHIPS DORMANT — until INTERAKT_WEBHOOK_SECRET is set in Supabase env AND
// the webhook URL is registered in the Interakt dashboard, this function
// just returns 401 on every call. Safe to deploy.
//
// To enable:
//   1. Add INTERAKT_WEBHOOK_SECRET secret in Supabase env (any high-entropy
//      string — also configured on Interakt's side)
//   2. Register https://<project>.functions.supabase.co/interakt-webhook
//      as the inbound-message webhook in Interakt dashboard, with that secret
//   3. (Optional) Ask the member to text STOP to verify end-to-end
//
// Deployed with verify_jwt=false because Interakt can't send Supabase JWTs.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getServiceClient, jsonResponse } from '../_shared/auth.ts'

// Keywords treated as opt-out. Casefold + trim before checking. This is the
// industry standard set across major BSPs / DLT guidelines.
const STOP_KEYWORDS = new Set([
  'stop', 'stopall', 'unsubscribe', 'opt out', 'optout', 'cancel', 'end', 'quit',
])
// Casefold + trim. If the entire message (after normalization) IS one of the
// keywords, treat as opt-out. Substring matching is intentionally avoided
// (a "stop yelling at me" inbound shouldn't trigger).
function isStopMessage(text: string | undefined): boolean {
  if (!text) return false
  return STOP_KEYWORDS.has(text.toLowerCase().trim())
}

// Normalize phone to the last 10 digits — that's what Indian gym members
// typically store. Interakt sends 12-digit E.164 like `919876543210`.
function lastTenDigits(raw: string | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.slice(-10)
}

// HMAC-SHA256 hex of (secret + body). Constant-time compare to avoid
// timing attacks. Interakt's exact signature scheme should be confirmed in
// the dashboard — most BSPs use HMAC-SHA256 of the raw body keyed by the
// shared secret, sent in `x-interakt-signature` or `x-hub-signature-256`.
async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  // Some providers send `sha256=<hex>` — strip the prefix if present.
  const provided = header.startsWith('sha256=') ? header.slice(7) : header
  // Constant-time compare
  if (provided.length !== hex.length) return false
  let mismatch = 0
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ provided.charCodeAt(i)
  return mismatch === 0
}

// Flexible payload extraction. Interakt's inbound-message webhook can
// arrive in either their proprietary shape or a Meta Cloud API passthrough.
// We try both. Each extractor returns { phone, text } or null.
type Inbound = { phone: string; text: string }

function extractInteraktProprietary(p: any): Inbound | null {
  // Common Interakt shape: { event: "message_received", data: { from: "...", message: { text: "..." } } }
  const phone = p?.data?.from ?? p?.data?.phone_number ?? p?.from
  const text  = p?.data?.message?.text ?? p?.data?.message?.body ?? p?.data?.text
  return phone && text ? { phone, text } : null
}

function extractMetaCloudApi(p: any): Inbound | null {
  // Meta Cloud API shape (some BSPs proxy this through):
  //   { entry: [{ changes: [{ value: { messages: [{ from: "...", text: { body: "..." } }] } }] }] }
  const msg = p?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const phone = msg?.from
  const text  = msg?.text?.body
  return phone && text ? { phone, text } : null
}

function extractMessage(payload: unknown): Inbound | null {
  return extractInteraktProprietary(payload) ?? extractMetaCloudApi(payload)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const SECRET = Deno.env.get('INTERAKT_WEBHOOK_SECRET')
  if (!SECRET) {
    // Dormant mode — function deployed but webhook intentionally not yet
    // wired up. 401 prevents accidental processing of stale calls.
    return new Response('webhook not configured', { status: 401 })
  }

  const rawBody = await req.text()

  // Signature header name varies by provider. Try the common candidates.
  const sigHeader =
    req.headers.get('x-interakt-signature') ??
    req.headers.get('x-hub-signature-256') ??
    req.headers.get('x-signature')

  const ok = await verifySignature(rawBody, sigHeader, SECRET)
  if (!ok) {
    console.warn('interakt-webhook: signature mismatch')
    return new Response('invalid signature', { status: 401 })
  }

  let payload: unknown
  try { payload = JSON.parse(rawBody) }
  catch { return new Response('invalid json', { status: 400 }) }

  const msg = extractMessage(payload)
  if (!msg) {
    // Not an inbound message — could be a delivery-status callback or some
    // other event we don't care about. ACK 200 so Interakt doesn't retry.
    return jsonResponse({ ok: true, ignored: 'not an inbound message' })
  }

  if (!isStopMessage(msg.text)) {
    // Inbound but not a STOP — not our concern here. ACK and move on.
    return jsonResponse({ ok: true, ignored: 'not a stop keyword' })
  }

  const phone10 = lastTenDigits(msg.phone)
  if (!phone10) {
    console.warn('interakt-webhook: could not normalize phone', { phone: msg.phone })
    return jsonResponse({ ok: true, ignored: 'invalid phone' })
  }

  // Flip unsubscribed=true for every membership row matching this phone.
  // A member can appear in multiple gyms — opt-out applies across all of
  // them (it's per-number on the BSP side, so per-row would lie). Match
  // on the LAST 10 DIGITS of the stored phone since gyms sometimes save
  // with country code and sometimes without.
  const supabase = getServiceClient()
  const { data: updated, error } = await supabase
    .from('members')
    .update({ unsubscribed: true })
    .or(`phone.eq.${phone10},phone.eq.91${phone10},phone.eq.+91${phone10}`)
    .eq('unsubscribed', false)   // only flip rows that aren't already opted out (saves writes)
    .select('id, gym_id, name')

  if (error) {
    console.error('interakt-webhook: update failed', error)
    // Return 500 so Interakt retries — better than silently dropping a
    // compliance signal because of a transient DB blip.
    return new Response('db error', { status: 500 })
  }

  const flipped = updated?.length ?? 0
  console.log(`interakt-webhook: STOP from ${phone10} → flipped ${flipped} member row(s)`)

  return jsonResponse({
    ok: true,
    phone_last10: phone10,
    flipped,
    member_ids: (updated ?? []).map(r => r.id),
  })
})
