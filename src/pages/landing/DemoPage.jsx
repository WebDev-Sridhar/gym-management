import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { DEMO_CONTENT } from '../../lib/content/demo'
import { mapDemoData } from '../../lib/mappers/marketingMapper'

export default function DemoPage() {
  usePageTracking('demo')
  const data = mapDemoData(DEMO_CONTENT)

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <div className="relative overflow-hidden">

          <SectionWrapper>
            <div className="text-center max-w-2xl mx-auto">

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl font-extrabold text-text-primary"
              >
                {data.hero.title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 text-text-secondary"
              >
                {data.hero.subtitle}
              </motion.p>

              {data.cta && (
                <div className="mt-10">
                  <Link
                    to={data.cta.to}
                    className="inline-block px-8 py-4 bg-accent-purple text-white rounded-xl font-semibold hover:opacity-90 transition"
                  >
                    {data.cta.label}
                  </Link>
                </div>
              )}

            </div>
          </SectionWrapper>

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
