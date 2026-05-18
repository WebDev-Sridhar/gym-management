import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import Card from '../../components/ui/Card'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { PRICING_CONTENT } from '../../lib/content/pricing'
import { mapPricingData } from '../../lib/mappers/marketingMapper'

export default function PricingPage() {
  usePageTracking('pricing')
  const data = mapPricingData(PRICING_CONTENT)

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

          {/* PLANS */}
          <SectionWrapper>
            <div className="grid md:grid-cols-3 gap-6">
              {data.plans.map((plan) => (
                <Card key={plan.name}>
                  <div className={`flex flex-col h-full ${plan.highlighted ? 'scale-[1.02]' : ''}`}>

                    {plan.highlighted && (
                      <span className="mb-4 text-xs text-accent-cyan font-semibold uppercase">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-xl font-bold text-text-primary">
                      {plan.name}
                    </h3>

                    <p className="text-text-muted text-sm mt-2">
                      {plan.description}
                    </p>

                    <div className="mt-6">
                      <span className="text-3xl font-extrabold text-text-primary">
                        {plan.price}
                      </span>
                      <span className="text-text-muted">{plan.period}</span>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-text-secondary flex-1">
                      {plan.features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>

                    <Link
                      to={plan.ctaTo}
                      className={`mt-8 inline-block text-center px-6 py-3 rounded-xl font-semibold transition ${
                        plan.highlighted
                          ? 'bg-accent-purple text-white'
                          : 'border border-border text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </SectionWrapper>

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
