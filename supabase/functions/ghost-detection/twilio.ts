// Twilio WhatsApp sender — kept local to this function (legacy path).
// New code should use _shared/notifications.ts (Interakt + Resend).
//
// Env vars required:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM — e.g. "whatsapp:+14155238886"

export interface WhatsAppResult {
  success: boolean
  sid?: string
  error?: string
  dryRun?: boolean
}

export async function sendWhatsApp(
  to: string,
  body: string,
): Promise<WhatsAppResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886'

  // Normalize phone: ensure +91 prefix and whatsapp: prefix
  const cleanPhone = to.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`
  const whatsappTo = `whatsapp:${fullPhone}`

  if (!accountSid || !authToken) {
    console.log(`[DRY RUN] WhatsApp to ${whatsappTo}: ${body.substring(0, 80)}...`)
    return { success: true, dryRun: true }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = btoa(`${accountSid}:${authToken}`)

  const formBody = new URLSearchParams({
    From: fromNumber,
    To: whatsappTo,
    Body: body,
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`WhatsApp sent to ${whatsappTo}, SID: ${data.sid}`)
      return { success: true, sid: data.sid }
    } else {
      console.error(`Twilio error ${response.status}:`, data.message || data)
      return { success: false, error: data.message || `HTTP ${response.status}` }
    }
  } catch (err) {
    console.error(`Twilio fetch error for ${whatsappTo}:`, err)
    return { success: false, error: String(err) }
  }
}
