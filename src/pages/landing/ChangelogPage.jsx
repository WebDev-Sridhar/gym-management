import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { CHANGELOG_CONTENT } from '../../lib/content/changelog'
import { mapChangelogData } from '../../lib/mappers/marketingMapper'

export default function ChangelogPage() {
  usePageTracking('changelog')
  const data = mapChangelogData(CHANGELOG_CONTENT)

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <div className="relative overflow-hidden">

          <SectionWrapper>
            <div className="text-center mb-16">
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl font-extrabold text-text-primary"
              >
                {data.hero.title}
              </motion.h1>
              <p className="text-text-secondary mt-4">
                {data.hero.subtitle}
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-10">
              {data.entries.map((item) => (
                <motion.div key={item.version} variants={fadeUp}>
                  <div className="border border-border rounded-xl p-6 bg-bg-elevated/30">

                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-text-primary">
                        {item.version}
                      </h3>
                      <span className="text-sm text-text-muted">
                        {item.date}
                      </span>
                    </div>

                    <ul className="space-y-2 text-text-secondary text-sm">
                      {item.changes.map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>

                  </div>
                </motion.div>
              ))}
            </div>

          </SectionWrapper>

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
