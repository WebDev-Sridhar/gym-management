// Registry for the per-gym legal pages. Maps each page_key to its label, public
// URL segment, and the hardcoded default-content generator. Used by:
//   - the public legal page renderer (default when a gym hasn't customised)
//   - the footer (labels + paths, filtered by enabled state)
//   - the owner CMS legal editor (seed defaults, list pages)
//
// `core: true` marks the compliance-sensitive pages (Privacy / Terms / Refund)
// — the editor warns before disabling these, but they CAN still be turned off.

import { getGymPrivacyContent } from './privacy'
import { getGymTermsContent } from './terms'
import { getGymRefundContent } from './refund'
import { getGymMembershipContent } from './membership'
import { getGymWaiverContent } from './waiver'

export const LEGAL_PAGES = [
  { key: 'privacy',    path: 'privacy',    label: 'Privacy Policy',            core: true  },
  { key: 'terms',      path: 'terms',      label: 'Terms & Conditions',        core: true  },
  { key: 'refund',     path: 'refund',     label: 'Refund & Cancellation',     core: true  },
  { key: 'membership', path: 'membership', label: 'Membership Agreement',      core: false },
  { key: 'waiver',     path: 'waiver',     label: 'Health & Liability Waiver', core: false },
]

const GETTERS = {
  privacy:    getGymPrivacyContent,
  terms:      getGymTermsContent,
  refund:     getGymRefundContent,
  membership: getGymMembershipContent,
  waiver:     getGymWaiverContent,
}

export function legalPageMeta(pageKey) {
  return LEGAL_PAGES.find(p => p.key === pageKey) || null
}

/**
 * Returns the hardcoded default content for a page, interpolated with the
 * gym's fields: { seo, meta, title, intro, sections: [{id, heading, body}] }.
 */
export function getDefaultLegalContent(pageKey, gym) {
  const fn = GETTERS[pageKey]
  return fn ? fn(gym) : null
}
