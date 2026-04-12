import { motion } from 'framer-motion'
import SectionWrapper from '../layout/SectionWrapper'
import GradientText from '../ui/GradientText'
import Button from '../ui/Button'
import { fadeUp } from '../../lib/animations'
import { PRICING_PLANS } from '../../lib/constants'

function PricingCard({ plan }) {
  const isHighlighted = plan.highlighted

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
      className={`
        relative rounded-2xl p-[1px] overflow-hidden
        ${isHighlighted
          ? 'bg-gradient-to-br from-accent-purple via-accent-blue to-accent-cyan shadow-[0_0_40px_rgba(139,92,246,0.2)]'
          : 'bg-gradient-to-br from-border/60 via-transparent to-border/30'
        }
      `}
    >
      {/* Popular badge */}
      {isHighlighted && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-gradient-to-r from-accent-purple to-accent-blue text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
            Most Popular
          </div>
        </div>
      )}

      <div className={`
        relative rounded-2xl p-8 h-full flex flex-col
        ${isHighlighted ? 'bg-bg-card/95' : 'bg-bg-card/80'}
        backdrop-blur-xl
      `}>
        <div className="mb-6">
          <h3 className="text-text-primary font-bold text-xl mb-2">{plan.name}</h3>
          <p className="text-text-muted text-sm">{plan.description}</p>
        </div>

        <div className="flex items-baseline gap-1 mb-8">
          <span className="text-text-primary font-extrabold text-4xl tracking-tight">{plan.price}</span>
          <span className="text-text-muted text-sm">{plan.period}</span>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <svg
                className={`w-5 h-5 shrink-0 mt-0.5 ${isHighlighted ? 'text-accent-purple' : 'text-text-muted'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-text-secondary">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={isHighlighted ? 'primary' : 'secondary'}
          className="w-full"
          href="/signup"
        >
          {plan.cta}
        </Button>
      </div>
    </motion.div>
  )
}

export default function Pricing() {
  return (
    <SectionWrapper id="pricing">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.span
          variants={fadeUp}
          className="inline-block text-sm font-medium text-accent-purple uppercase tracking-widest mb-4"
        >
          Pricing
        </motion.span>
        <GradientText
          as="h2"
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          Simple, Transparent Pricing
        </GradientText>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto"
        >
          Start free. Scale as you grow. No hidden fees, no surprises.
        </motion.p>
      </div>

      {/* Pricing Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {PRICING_PLANS.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </SectionWrapper>
  )
}
