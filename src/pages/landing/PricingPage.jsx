import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Card from '../../components/ui/Card'
import { fadeUp } from '../../lib/animations'
import { PRICING_PLANS } from '../../lib/constants'

export default function PricingPage() {
  return (
    <MarketingLayout>
    <div className="relative overflow-hidden">

      {/* HERO */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary"
          >
            Simple, Transparent Pricing
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-text-secondary text-lg"
          >
            Choose a plan that fits your gym size and scale confidently.
          </motion.p>
        </div>
      </SectionWrapper>

      {/* PLANS */}
      <SectionWrapper>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
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

                <button
                  className={`mt-8 px-6 py-3 rounded-xl font-semibold transition ${
                    plan.highlighted
                      ? 'bg-accent-purple text-white'
                      : 'border border-border text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </SectionWrapper>

    </div>
    </MarketingLayout>
  )
}