import { supabaseAnon } from './supabaseClient'

// Platform-level sales lead capture (Gymmobius marketing site).
// Distinct from per-gym `contact_messages` (which is scoped by gym_id and
// used by individual gym public websites).
export async function submitContactLead({ name, email, phone, message, source = 'contact_page' }) {
  const { error } = await supabaseAnon
    .from('contact_leads')
    .insert({
      name,
      email,
      phone: phone || null,
      message,
      source,
    })
  if (error) throw error
}
