import { LEGAL_META } from '../constants/legal'

function safeSeo(raw) {
  return {
    title: raw?.title || '',
    description: raw?.description || '',
    canonical: raw?.canonical || '',
    robots: raw?.robots || 'index,follow',
  }
}

function safeMeta(raw) {
  return {
    effectiveDate: raw?.effectiveDate || LEGAL_META.effectiveDate,
    lastUpdated: raw?.lastUpdated || LEGAL_META.lastUpdated,
    version: raw?.version || LEGAL_META.version,
    jurisdiction: raw?.jurisdiction || LEGAL_META.jurisdiction,
    supportContact: raw?.supportContact || LEGAL_META.supportContact,
  }
}

function safeLegal(raw) {
  return {
    seo: safeSeo(raw?.seo),
    meta: safeMeta(raw?.meta),
    title: raw?.title || '',
    intro: raw?.intro || '',
    sections: Array.isArray(raw?.sections) ? raw.sections : [],
  }
}

export const mapPrivacyData = safeLegal
export const mapTermsData = safeLegal
export const mapSecurityData = safeLegal
export const mapRefundData = safeLegal
