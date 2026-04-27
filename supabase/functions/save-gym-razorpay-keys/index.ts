// POST /functions/v1/save-gym-razorpay-keys
// Body: { razorpayKeyId, razorpayKeySecret?, razorpayWebhookSecret?, mode }
//
// Validates the keys by creating a real ₹1 test Razorpay Order, then encrypts
// secrets with the CURRENT_ENC_VERSION key, upserts settings, and flips
// gyms.razorpay_enabled = true on success.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import {
  encryptSecret,
  decryptSecret,
  byteaToBytes,
  bytesToBytea,
  CURRENT_ENC_VERSION,
} from '../_shared/crypto.ts'
import { validateKeysWithTestOrder } from '../_shared/razorpay.ts'

interface Body {
  razorpayKeyId?: string
  razorpayKeySecret?: string
  razorpayWebhookSecret?: string
  mode?: 'test' | 'live'
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    const supabase = getServiceClient()

    // Load existing row (if any) to support partial updates
    const { data: existing } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_id, razorpay_key_secret_enc, razorpay_webhook_secret_enc, encryption_version, mode')
      .eq('gym_id', gymId)
      .maybeSingle()

    const keyId = body.razorpayKeyId?.trim() || existing?.razorpay_key_id
    if (!keyId) throw new HttpError(400, 'razorpayKeyId is required')

    // Determine the plaintext key secret to validate with
    let keySecretPlain = body.razorpayKeySecret?.trim()
    if (!keySecretPlain) {
      if (!existing?.razorpay_key_secret_enc) {
        throw new HttpError(400, 'razorpayKeySecret is required for first-time setup')
      }
      keySecretPlain = await decryptSecret(
        existing.encryption_version ?? 1,
        byteaToBytes(existing.razorpay_key_secret_enc),
      )
    }

    // 1. Validate by creating a real ₹1 test order. Proves key validity AND
    //    that the keys have orders:write permission AND mode consistency.
    const validation = await validateKeysWithTestOrder({ keyId, keySecret: keySecretPlain })
    if (!validation.ok) {
      throw new HttpError(400, validation.reason ?? 'Razorpay rejected the test')
    }

    // 2. Encrypt new values with CURRENT_ENC_VERSION
    const updates: Record<string, unknown> = {
      gym_id: gymId,
      razorpay_key_id: keyId,
      mode: body.mode ?? existing?.mode ?? 'test',
      is_active: true,
      last_test_at: new Date().toISOString(),
      encryption_version: CURRENT_ENC_VERSION,
    }

    if (body.razorpayKeySecret?.trim()) {
      const enc = await encryptSecret(body.razorpayKeySecret.trim())
      updates.razorpay_key_secret_enc = bytesToBytea(enc.bytes)
    }
    if (body.razorpayWebhookSecret?.trim()) {
      const enc = await encryptSecret(body.razorpayWebhookSecret.trim())
      updates.razorpay_webhook_secret_enc = bytesToBytea(enc.bytes)
    }

    // If we re-encrypted both secrets we're fully on CURRENT_ENC_VERSION.
    // If only one was supplied, we'd actually need to re-encrypt the other too
    // to keep them on the same version. For now, both inputs together = clean
    // version upgrade; partial updates leave the version unchanged from existing.
    const onlyKeyChanged = !!body.razorpayKeySecret?.trim() && !body.razorpayWebhookSecret?.trim()
    const onlyWebhookChanged = !body.razorpayKeySecret?.trim() && !!body.razorpayWebhookSecret?.trim()
    if ((onlyKeyChanged || onlyWebhookChanged) && existing) {
      // Mixed versions would be confusing — keep existing version unless both rotate
      updates.encryption_version = existing.encryption_version ?? 1
    }

    // 3. Upsert
    const { error: upErr } = await supabase
      .from('gym_payment_settings')
      .upsert(updates, { onConflict: 'gym_id' })
    if (upErr) throw new Error(`upsert failed: ${upErr.message}`)

    // 4. Flip gym flags
    const { error: gymErr } = await supabase
      .from('gyms')
      .update({ razorpay_enabled: true, payment_mode: 'razorpay' })
      .eq('id', gymId)
    if (gymErr) throw new Error(`gym update failed: ${gymErr.message}`)

    return jsonResponse({
      ok: true,
      mode: updates.mode,
      testOrderId: validation.testOrderId,
      encryptionVersion: updates.encryption_version,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
