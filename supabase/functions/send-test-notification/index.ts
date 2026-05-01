// POST /functions/v1/send-test-notification
// Body: { channel: 'whatsapp' | 'email' }
//
// Owner-only. Sends a synthetic test notification to the calling owner via the
// requested channel so they can confirm the channel works end-to-end. Writes
// a 'welcome' notification row (test triggered_by) for audit.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { sendInteraktTemplate, normalizeIndianPhone } from '../_shared/interakt.ts'
import { sendEmail } from '../_shared/resend.ts'

interface Body {
  channel: 'whatsapp' | 'email'
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId, userId } = await requireOwner(req)
    const body = await req.json() as Body
    if (body.channel !== 'whatsapp' && body.channel !== 'email') {
      throw new HttpError(400, "channel must be 'whatsapp' or 'email'")
    }

    const supabase = getServiceClient()

    const { data: gym } = await supabase
      .from('gyms').select('id, name, theme_color').eq('id', gymId).single()
    const { data: owner } = await supabase
      .from('users').select('name, phone, email').eq('id', userId).single()
    if (!owner) throw new HttpError(404, 'owner profile not found')

    let result: { ok: true; channel: string; id?: string }

    if (body.channel === 'whatsapp') {
      if (!owner.phone) throw new HttpError(400, 'no phone on file — add one in Settings first')
      const norm = normalizeIndianPhone(owner.phone)
      const r = await sendInteraktTemplate({
        countryCode: norm.countryCode,
        phoneNumber: norm.phoneNumber,
        templateName: Deno.env.get('INTERAKT_TEMPLATE_WELCOME') ?? 'member_welcome',
        languageCode: 'en',
        bodyValues: [owner.name ?? 'Owner', gym?.name ?? 'GymOS', 'Test Plan'],
      })
      result = { ok: true, channel: 'whatsapp', id: r.id }
    } else {
      if (!owner.email) throw new HttpError(400, 'no email on file — add one in Settings first')
      const r = await sendEmail({
        to: owner.email,
        subject: `✓ Test email from ${gym?.name ?? 'GymOS'}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#1f2937;">
            <h2 style="margin-top:0">Email is working ✓</h2>
            <p>Hi ${owner.name ?? 'there'} — this is a test email from your GymOS dashboard.</p>
            <p>If you received this, your email channel is configured correctly. Members will receive payment receipts and notifications via this channel.</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Sent at ${new Date().toLocaleString()}</p>
          </div>
        `,
      })
      result = { ok: true, channel: 'email', id: r.id }
    }

    // Audit row
    await supabase.from('notifications').insert({
      gym_id: gymId,
      user_id: userId,
      type: 'welcome',
      channels: [body.channel],
      status: 'sent',
      triggered_by: 'manual',
      metadata: { test: true, channel: body.channel },
      channel_results: { [body.channel]: { status: 'sent', id: result.id } },
      sent_at: new Date().toISOString(),
    })

    return jsonResponse(result)
  } catch (err) {
    return errorResponse(err)
  }
})
