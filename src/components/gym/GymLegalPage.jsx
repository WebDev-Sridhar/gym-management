import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import SEO from '../seo/SEO'
import MarketingErrorBoundary from '../error/MarketingErrorBoundary'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { staggerContainer, fadeUp, scrollViewport } from '../../lib/animations'

// Shared layout for every per-gym legal page. The caller passes:
//   - getContent: (gym) => structured legal content { seo, meta, title, intro, sections }
//   - pageKey:    short string used for analytics (e.g. 'privacy', 'terms')
// The component reads gym data from GymContext (already fetched in GymLayout),
// runs the content function to interpolate gym-specific values, and renders
// using the gym's theme CSS variables.
export default function GymLegalPage({ getContent, pageKey }) {
  const { gym } = useGym()
  usePageTracking(`gym-${pageKey}:${gym?.slug || 'unknown'}`)

  const data = getContent(gym)

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

          <p
            className="text-base md:text-lg leading-relaxed mb-6"
            style={{ color: 'var(--gym-text-secondary)' }}
          >
            {data.intro}
          </p>

          <p
            className="text-xs mb-10"
            style={{ color: 'var(--gym-text-muted)' }}
          >
            Effective: {data.meta.effectiveDate} · Last updated: {data.meta.lastUpdated} · Version {data.meta.version} · Jurisdiction: {data.meta.jurisdiction}
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} className="space-y-8">
          {data.sections.map((section) => (
            <motion.div
              key={section.id}
              id={section.id}
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
                className="text-sm md:text-base leading-relaxed"
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
