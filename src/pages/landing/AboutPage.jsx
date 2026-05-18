import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { ABOUT_CONTENT } from '../../lib/content/about'
import { mapAboutData } from '../../lib/mappers/marketingMapper'

export default function AboutPage() {
  usePageTracking('about')
  const data = mapAboutData(ABOUT_CONTENT)

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <div className="relative overflow-hidden">

          <SectionWrapper>
            <div className="max-w-3xl mx-auto text-center">
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-text-primary">
                {data.hero.title}
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-text-secondary">
                {data.hero.subtitle}
              </motion.p>
            </div>
          </SectionWrapper>

          <SectionWrapper>
            <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{data.mission.title}</h3>
                <p className="text-text-muted">{data.mission.body}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{data.vision.title}</h3>
                <p className="text-text-muted">{data.vision.body}</p>
              </div>
            </div>
          </SectionWrapper>

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
