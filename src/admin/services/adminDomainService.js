import { supabaseData } from '../../services/supabaseClient'

/**
 * Every gym that has claimed a subdomain or custom domain, with verification
 * + DNS diagnostics (from domain_verification_data). Read-only monitoring;
 * active verify/detach remains the owner flow in /api/domain/*.
 */
export async function listDomains() {
  const { data, error } = await supabaseData
    .from('gyms')
    .select('id, name, slug, subdomain, custom_domain, domain_status, domain_verified_at, domain_verification_data, status')
    .or('subdomain.not.is.null,custom_domain.not.is.null')
    .order('domain_status', { ascending: true })
  if (error) throw error
  return data || []
}
