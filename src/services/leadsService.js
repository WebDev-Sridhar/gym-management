import { supabase } from './supabaseClient'

// Platform-level lead capture (Gymmobius marketing site Contact + Careers forms).
// Routes through the submit-saas-lead edge function which:
//   1. Validates inputs server-side
//   2. Inserts the audit row into contact_leads (via service role — RLS-safe)
//   3. Emails the SaaS support inbox so leads are seen in near-real-time
//
// Was previously a direct anon insert into contact_leads — that worked, but
// left submissions in the DB with nobody notified. The edge fn unifies both.
//
// Distinct from per-gym `contact_messages` (which is scoped by gym_id and
// used by individual gym public websites — see contactService.js).
export async function submitContactLead({ name, email, phone, message, source = 'contact_page' }) {
  const { data, error } = await supabase.functions.invoke('submit-saas-lead', {
    body: { name, email, phone, message, source },
  })
  // Non-2xx from the edge fn → supabase-js returns { data: null, error: FunctionsHttpError }
  // and doesn't auto-parse the JSON body. Unwrap so the friendly validation
  // message (e.g. "Please write a bit more about what you need.") reaches
  // the form's error display instead of the generic "non-2xx status" wrapper.
  if (error) {
    let bodyMsg = null
    try {
      const body = await error.context?.json?.()
      bodyMsg = body?.message ?? body?.error ?? null
    } catch { /* not JSON — fall through */ }
    throw new Error(bodyMsg || error.message || 'Submission failed. Please try again.')
  }
  if (data?.error) throw new Error(data.message || data.error)
  return data
}
