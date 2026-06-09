// POST /functions/v1/submit-saas-lead
// Body: { name, email, phone?, message, source }
//
// PUBLIC (no JWT). Powers the SaaS marketing site's Contact + Careers forms.
// Replaces the previous direct anon-insert into contact_leads — that left
// submissions silently in the DB with nobody notified. This function:
//
//   1. Validates input (name, email shape, 10+ char message, source in set)
//   2. Inserts into contact_leads (via service role — RLS-safe)
//   3. Emails the SaaS support inbox (Resend, saasShell template)
//
// Honeypot drops + email validation + source whitelist provide basic abuse
// resistance. Cloudflare Turnstile is a v1.1 follow-up — see SELF_REGISTRATION.md
// for the broader spam-mitigation pattern when that's ready.
//
// Deploy:
//   supabase functions deploy submit-saas-lead --no-verify-jwt
// (config.toml already declares verify_jwt = false)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { sendEmail } from '../_shared/resend.ts'
import { saasLeadEmail } from '../_shared/emailTemplates.ts'

interface Body {
  name?:    string
  email?:   string
  phone?:   string
  message?: string
  source?:  string
}

const EMAIL_RX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Whitelist of acceptable sources. Anything else is rejected as malformed
// rather than stored — keeps the DB clean for filtering ("show me only
// careers leads") + makes it obvious if the frontend stops sending source.
const VALID_SOURCES = new Set(['contact_page', 'careers_page'])

const SUPPORT_INBOX = Deno.env.get('SAAS_SUPPORT_EMAIL') ?? 'gymmobius.support@gmail.com'

Deno.serve(async (req: Request) => {
  const cors = handleCorsPreflight(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST required')

    const body = (await req.json().catch(() => ({}))) as Body
    const name    = String(body.name    ?? '').trim()
    const email   = String(body.email   ?? '').trim().toLowerCase()
    const phone   = body.phone ? String(body.phone).trim() : null
    const message = String(body.message ?? '').trim()
    const source  = String(body.source  ?? '').trim()

    if (name.length < 2)        throw new HttpError(400, 'Please enter your name.')
    if (!EMAIL_RX.test(email))  throw new HttpError(400, 'Please enter a valid email address.')
    if (message.length < 10)    throw new HttpError(400, 'Please write a bit more about what you need.')
    if (!VALID_SOURCES.has(source)) throw new HttpError(400, 'Invalid form source.')

    const supabase = getServiceClient()

    // Insert audit row first — even if the email fails we have the record.
    const { data: lead, error: insErr } = await supabase
      .from('contact_leads')
      .insert({ name, email, phone, message, source })
      .select('id, created_at')
      .single()
    if (insErr) throw new Error(`failed to record lead: ${insErr.message}`)

    // Best-effort email notification. If Resend is down, the lead still
    // exists in the DB and we return success to the user — better UX than
    // showing them an error when their submission DID land somewhere.
    let emailStatus: 'sent' | 'failed' = 'sent'
    let emailError: string | null = null
    try {
      const tpl = saasLeadEmail({ name, email, phone, message, source, leadId: lead.id })
      await sendEmail({
        to:      SUPPORT_INBOX,
        subject: tpl.subject,
        html:    tpl.html,
        replyTo: email,    // hitting Reply in the inbox writes back to the sender
      })
    } catch (err) {
      emailStatus = 'failed'
      emailError  = err instanceof Error ? err.message : String(err)
      console.error('submit-saas-lead: notify-support email failed:', emailError)
    }

    return jsonResponse({
      ok: true,
      leadId: lead.id,
      emailStatus,
      message: "Thanks — we've received your message and will reply within 24 hours.",
    })
  } catch (err) {
    return errorResponse(err)
  }
})
