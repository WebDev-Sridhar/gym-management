import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../../lib/animations'
import PricingCard from '../PricingCard'

export default function ProgramsSection({ plans, defaults, themeColor }) {
  const displayPlans = plans.length > 0 ? plans : defaults.programs.fallbackPlans

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {/* Section header */}
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span
            className="inline-block text-sm font-semibold tracking-wider uppercase mb-3"
            style={{ color: 'var(--gym-primary)' }}
          >
            Membership
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: 'var(--gym-text)' }}>
            {defaults.programs.heading}
          </h2>
          <p className="max-w-lg mx-auto" style={{ color: 'var(--gym-text-muted)' }}>
            {defaults.programs.subtitle}
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} themeColor={themeColor} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
