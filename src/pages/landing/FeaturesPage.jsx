import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import Card from '../../components/ui/Card'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { FEATURES_CONTENT } from '../../lib/content/features'
import { mapFeaturesData } from '../../lib/mappers/marketingMapper'
import { QrCodeIcon, CreditCardIcon, ChartBarIcon, UsersIcon } from '../../components/ui/Icons'

const featureIcons = {
  qrCode: QrCodeIcon,
  creditCard: CreditCardIcon,
  chartBar: ChartBarIcon,
  users: UsersIcon,
}

export default function FeaturesPage() {
  usePageTracking('features')
  const data = mapFeaturesData(FEATURES_CONTENT)

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <div className="relative overflow-hidden">

          {/* HERO */}
          <SectionWrapper>
            <div className="text-center max-w-3xl mx-auto">
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary"
              >
                {data.hero.title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 text-text-secondary text-lg"
              >
                {data.hero.subtitle}
              </motion.p>
            </div>
          </SectionWrapper>

          {/* FEATURE GRID */}
          <SectionWrapper>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.features.map((feature) => {
                const Icon = featureIcons[feature.iconKey]
                return (
                  <Card key={feature.title}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-5">
                        {Icon ? <Icon className="w-6 h-6 text-accent-purple" /> : null}
                      </div>

                      <h3 className="text-text-primary font-bold text-xl mb-3">
                        {feature.title}
                      </h3>

                      <p className="text-text-muted text-sm leading-relaxed flex-1">
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </SectionWrapper>

          {/* CTA */}
          {data.cta && (
            <SectionWrapper>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-text-primary">
                  {data.cta.title}
                </h2>

                <p className="text-text-secondary mt-4">
                  {data.cta.subtitle}
                </p>

                <div className="mt-8">
                  <Link
                    to={data.cta.to}
                    className="inline-block px-8 py-4 bg-accent-purple text-white rounded-xl font-semibold hover:opacity-90 transition"
                  >
                    {data.cta.label}
                  </Link>
                </div>
              </div>
            </SectionWrapper>
          )}

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
