import { motion } from 'framer-motion'
import SectionWrapper from '../layout/SectionWrapper'
import Card from '../ui/Card'
import GradientText from '../ui/GradientText'
import { fadeUp } from '../../lib/animations'
import { FEATURES } from '../../lib/constants'
import { QrCodeIcon, CreditCardIcon, ChartBarIcon, UsersIcon } from '../ui/Icons'

const featureIcons = {
  qrCode: QrCodeIcon,
  creditCard: CreditCardIcon,
  chartBar: ChartBarIcon,
  users: UsersIcon,
}

export default function Features() {
  return (
    <SectionWrapper id="features">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent-blue/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="text-center mb-16 relative">
        <motion.span
          variants={fadeUp}
          className="inline-block text-sm font-medium text-accent-cyan uppercase tracking-widest mb-4"
        >
          Features
        </motion.span>
        <GradientText
          as="h2"
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          Everything You Need to Scale
        </GradientText>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto"
        >
          Powerful tools designed specifically for gym owners who want to grow, not just manage.
        </motion.p>
      </div>

      {/* Feature Grid */}
      <div className="grid sm:grid-cols-2 gap-6 relative">
        {FEATURES.map((feature) => {
          const Icon = featureIcons[feature.iconKey]
          return (
            <Card key={feature.title}>
              <div className="flex flex-col h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-accent-purple" />
                </div>
                <h3 className="text-text-primary font-bold text-xl mb-3">{feature.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed flex-1">{feature.description}</p>

                {/* Subtle learn more link */}
                <div className="mt-5 pt-4 border-t border-border/30">
                  <span className="text-accent-purple text-sm font-medium hover:text-accent-blue transition-colors cursor-pointer flex items-center gap-1.5">
                    Learn more
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
