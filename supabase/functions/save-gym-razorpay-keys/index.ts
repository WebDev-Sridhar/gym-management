// POST /functions/v1/save-gym-razorpay-keys
// Body: { razorpayKeyId, razorpayKeySecret?, razorpayWebhookSecret?, mode }
// Validates the keys against Razorpay, encrypts secrets, upserts settings,
// and flips gyms.razorpay_enabled = true on success.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { encryptSecret, bytesToBytea } from '../_shared/crypto.ts'
import { validateKeys } from '../_shared/razorpay.ts'

interface Body {
  razorpayKeyId?: string
  razorpayKeySecret?: string         // optional on update — keep existing if blank
  razorpayWebhookSecret?: string     // optional on update — keep existing if blank
  mode?: 'test' | 'live'
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    const supabase = getServiceClient()

    // Load existing row (if any) so we can support partial updates
    const { data: existing } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_id, razorpay_key_secret_enc, razorpay_webhook_secret_enc, mode')
      .eq('gym_id', gymId)
      .maybeSingle()

    const keyId = body.razorpayKeyId?.trim() || existing?.razorpay_key_id
    if (!keyId) throw new HttpError(400, 'razorpayKeyId is required')

    // Determine the plaintext key secret to use for validation
    let keySecretPlain = body.razorpayKeySecret?.trim()
    if (!keySecretPlain) {
      // No new secret supplied — we can't validate without it. If a secret already
      // exists in DB we trust the previous validation; if not, error.
      if (!existing?.razorpay_key_secret_enc) {
        throw new HttpError(400, 'razorpayKeySecret is required for first-time setup')
      }
      // Decrypt existing for validation
      const { decryptSecret, byteaToBytes } = await import('../_shared/crypto.ts')
      keySecretPlain = await decryptSecret(byteaToBytes(existing.razorpay_key_secret_enc))
    }

    // 1. Validate against Razorpay
    const ok = await validateKeys({ keyId, keySecret: keySecretPlain })
    if (!ok) throw new HttpError(400, 'Invalid Razorpay credentials (401 from Razorpay)')

    // 2. Encrypt the new values that were supplied
    const updates: Record<string, unknown> = {
      gym_id: gymId,
      razorpay_key_id: keyId,
      mode: body.mode ?? existing?.mode ?? 'test',
      is_active: true,
      last_test_at: new Date().toISOString(),
    }

    if (body.razorpayKeySecret?.trim()) {
      const enc = await encryptSecret(body.razorpayKeySecret.trim())
      updates.razorpay_key_secret_enc = bytesToBytea(enc)
    }
    if (body.razorpayWebhookSecret?.trim()) {
      const enc = await encryptSecret(body.razorpayWebhookSecret.trim())
      updates.razorpay_webhook_secret_enc = bytesToBytea(enc)
    }

    // 3. Upsert
    const { error: upErr } = await supabase
      .from('gym_payment_settings')
      .upsert(updates, { onConflict: 'gym_id' })

    if (upErr) throw new Error(`upsert failed: ${upErr.message}`)

    // 4. Flip gyms flags
    const { error: gymErr } = await supabase
      .from('gyms')
      .update({ razorpay_enabled: true, payment_mode: 'razorpay' })
      .eq('id', gymId)

    if (gymErr) throw new Error(`gym update failed: ${gymErr.message}`)

    return jsonResponse({ ok: true, mode: updates.mode })
  } catch (err) {
    return errorResponse(err)
  }
})
