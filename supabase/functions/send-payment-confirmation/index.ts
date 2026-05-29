// POST /functions/v1/send-payment-confirmation
// Body: { paymentId }
//
// Fires a payment_confirmation notification through the engine for a payment
// that was just marked paid via the frontend's `paymentService.markPaymentPaid`
// (manual "mark as paid" action — cash, bank transfer, etc.). The frontend
// can't call sendNotification directly because the engine lives server-side;
// this thin wrapper bridges the gap.
//
// Idempotency: the engine inserts an audit row in `notifications` per call.
// Repeated calls for the same payment will create duplicate audit rows AND
// duplicate WhatsApp/email sends. Owners shouldn't be re-triggering this
// — only `markPaymentPaid` fires it, and only once per payment-paid event.
// If we ever need stricter dedup, add a `unique(payment_id) where type
// = 'payment_confirmation'` partial index on notifications.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { sendNotification } from '../_shared/notifications.ts'

interface Body {
  paymentId: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body
    if (!body.paymentId) throw new HttpError(400, 'paymentId required')

    const supabase = getServiceClient()

    // Pull the payment scoped to this gym. amount + plan.name + member's
    // expiry_date give us everything sendNotification needs.
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('id, gym_id, member_id, amount, status, plan:plans(name), member:members(expiry_date)')
      .eq('id', body.paymentId)
      .eq('gym_id', gymId)
      .single() as { data: {
        id: string; gym_id: string; member_id: string | null
        amount: number; status: string
        plan: { name: string } | null
        member: { expiry_date: string | null } | null
      } | null; error: unknown }

    if (payErr || !payment) throw new HttpError(404, 'payment not found in this gym')
    if (payment.status !== 'paid') throw new HttpError(400, 'payment is not marked paid')
    if (!payment.member_id) throw new HttpError(400, 'payment has no associated member')

    const result = await sendNotification({
      supabase,
      gymId,
      type: 'payment_confirmation',
      memberId: payment.member_id,
      triggeredBy: 'manual',
      metadata: {
        payment_id: payment.id,
        planName: payment.plan?.name ?? 'Membership',
        amount: Number(payment.amount),
        expiresAt: payment.member?.expiry_date ?? null,
      },
    })

    return jsonResponse({
      ok: true,
      notificationId: result.notificationId,
      status: result.status,
      channelResults: result.channelResults,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
