// Minimal Resend HTTP client. One function: sendEmail.
// Set RESEND_API_KEY and (optionally) RESEND_FROM in Supabase Function secrets.
// Default sender: "GymOS <noreply@gymos.in>" — must be a verified domain in Resend dashboard.

const RESEND_API = 'https://api.resend.com/emails'

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface ResendResult {
  id: string
}

export async function sendEmail(params: SendEmailParams): Promise<ResendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const from = Deno.env.get('RESEND_FROM') ?? 'GymOS <noreply@gymos.in>'

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Resend send failed (${res.status}): ${txt}`)
  }

  return res.json() as Promise<ResendResult>
}
