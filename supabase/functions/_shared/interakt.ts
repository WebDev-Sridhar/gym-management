// Minimal Interakt WhatsApp client. Platform-level: uses one shared API key.
//
// Future-ready: when we add per-gym credentials, this module accepts an optional
// `apiKey` param. If passed, uses that; otherwise falls back to the platform key.

const INTERAKT_URL = 'https://api.interakt.ai/v1/public/message/'

export interface InteraktTemplateMessage {
  countryCode: string                // e.g. "+91"
  phoneNumber: string                // digits only, no + or country code
  templateName: string
  languageCode?: string              // default "en"
  bodyValues?: string[]              // {{1}}, {{2}}, ... in template body
  headerValues?: string[]            // for templates with header variables
  buttonValues?: Record<string, string[]>  // { "0": ["url-suffix"] } for URL CTAs
  callbackData?: string              // arbitrary string echoed back in webhook (e.g. payment_id)
  apiKeyOverride?: string            // optional, for future per-gym credentials
}

export interface InteraktResponse {
  result: boolean
  message?: string
  id?: string
}

export async function sendInteraktTemplate(msg: InteraktTemplateMessage): Promise<InteraktResponse> {
  const apiKey = msg.apiKeyOverride ?? Deno.env.get('INTERAKT_API_KEY')
  if (!apiKey) throw new Error('INTERAKT_API_KEY is not configured')

  // Interakt uses HTTP Basic with the API key as the username and empty password.
  // Authorization: Basic base64(apiKey + ':')
  const authHeader = 'Basic ' + btoa(apiKey + ':')

  const body = {
    countryCode: msg.countryCode,
    phoneNumber: msg.phoneNumber,
    callbackData: msg.callbackData ?? '',
    type: 'Template',
    template: {
      name: msg.templateName,
      languageCode: msg.languageCode ?? 'en',
      headerValues: msg.headerValues ?? [],
      bodyValues: msg.bodyValues ?? [],
      ...(msg.buttonValues ? { buttonValues: msg.buttonValues } : {}),
    },
  }

  const res = await fetch(INTERAKT_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let parsed: InteraktResponse
  try { parsed = JSON.parse(text) }
  catch { parsed = { result: false, message: text } }

  if (!res.ok || !parsed.result) {
    throw new Error(`interakt send failed (${res.status}): ${parsed.message ?? text}`)
  }

  return parsed
}

// Normalize an Indian phone number string to digits-only + country code.
// Accepts: "+919876543210", "9876543210", "91 9876543210", "+91-98765 43210"
// Returns: { countryCode: "+91", phoneNumber: "9876543210" } or throws.
export function normalizeIndianPhone(raw: string | null | undefined): {
  countryCode: string
  phoneNumber: string
} {
  if (!raw) throw new Error('phone number is empty')
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return { countryCode: '+91', phoneNumber: digits }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { countryCode: '+91', phoneNumber: digits.slice(2) }
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return { countryCode: '+91', phoneNumber: digits.slice(1) }
  }
  throw new Error(`unrecognized phone format: ${raw}`)
}
