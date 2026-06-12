import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import SEO from '../seo/SEO'
import MarketingErrorBoundary from '../error/MarketingErrorBoundary'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { staggerContainer, fadeUp, scrollViewport } from '../../lib/animations'
import { getDefaultLegalContent } from '../../lib/content/gym-legal'
import { fetchPublicLegalRows } from '../../services/gymLegalService'

// Shared layout for every per-gym legal page. The caller passes only `pageKey`.
// Content resolution:
//   - no custom row  → the hardcoded default (interpolated with the gym's fields)
//   - custom row, on → the owner's edited title / intro / sections
//   - custom row, off → the page is disabled; redirect to the gym home
// The default renders immediately (good for SEO / prerender); if a custom row
// loads, we swap to it.
export default function GymLegalPage({ pageKey }) {
  const { gym, basePath } = useGym()
  usePageTracking(`gym-${pageKey}:${gym?.slug || 'unknown'}`)

  const [row, setRow] = useState(undefined) // undefined = loading, null = no custom row

  useEffect(() => {
    if (!gym?.id) return
    let cancelled = false
    fetchPublicLegalRows(gym.id)
      .then(rows => { if (!cancelled) setRow(rows.find(r => r.page_key === pageKey) || null) })
      .catch(() => { if (!cancelled) setRow(null) })
    return () => { cancelled = true }
  }, [gym?.id, pageKey])

  // Owner turned this page off → not a public page anymore.
  if (row && row.enabled === false) return <Navigate to={basePath || '/'} replace />

  const def = getDefaultLegalContent(pageKey, gym)
  const isCustom = !!(row && row.enabled !== false && Array.isArray(row.sections) && row.sections.length)

  const data = isCustom
    ? {
        seo: { ...(def?.seo || {}), title: `${row.title || def?.title || ''} · ${gym?.name || ''}` },
        meta: { ...(def?.meta || {}), lastUpdated: (row.updated_at || '').slice(0, 10) || def?.meta?.lastUpdated },
        title: row.title || def?.title,
        intro: row.intro || def?.intro,
        sections: row.sections,
      }
    : def

  if (!data) return null

  return (
    <MarketingErrorBoundary>
      <SEO {...data.seo} />

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={scrollViewport}
        className="max-w-3xl mx-auto px-6 py-16 md:py-24"
      >
        <motion.div variants={fadeUp}>
          <h1
            className="text-4xl md:text-5xl font-sans font-bold mb-6 tracking-tight"
            style={{ color: 'var(--gym-text)' }}
          >
            {data.title}
          </h1>

          {data.intro && (
            <p
              className="text-base md:text-lg leading-relaxed mb-6"
              style={{ color: 'var(--gym-text-secondary)' }}
            >
              {data.intro}
            </p>
          )}

          {data.meta && (
            <p
              className="text-xs mb-10"
              style={{ color: 'var(--gym-text-muted)' }}
            >
              Effective: {data.meta.effectiveDate} · Last updated: {data.meta.lastUpdated} · Version {data.meta.version} · Jurisdiction: {data.meta.jurisdiction}
            </p>
          )}
        </motion.div>

        <motion.div variants={staggerContainer} className="space-y-8">
          {(data.sections || []).map((section, i) => (
            <motion.div
              key={section.id || i}
              id={section.id || undefined}
              variants={fadeUp}
              className="scroll-mt-24"
            >
              <h2
                className="text-lg md:text-xl font-semibold mb-2"
                style={{ color: 'var(--gym-text)' }}
              >
                {section.heading}
              </h2>
              <p
                className="text-sm md:text-base leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--gym-text-secondary)' }}
              >
                {section.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </MarketingErrorBoundary>
  )
}
