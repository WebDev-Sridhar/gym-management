import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import Card from '../../components/ui/Card'
import { fadeUp } from '../../lib/animations'
import { FEATURES } from '../../lib/constants'
import { QrCodeIcon, CreditCardIcon, ChartBarIcon, UsersIcon } from '../../components/ui/Icons'

const featureIcons = {
  qrCode: QrCodeIcon,
  creditCard: CreditCardIcon,
  chartBar: ChartBarIcon,
  users: UsersIcon,
}

export default function FeaturesPage() {
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
            Powerful Features for Modern Gyms
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-text-secondary text-lg"
          >
            Everything you need to run, grow, and automate your gym business — all in one platform.
          </motion.p>
        </div>
      </SectionWrapper>

      {/* FEATURE GRID */}
      <SectionWrapper>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = featureIcons[feature.iconKey]
            return (
              <Card key={feature.title}>
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-accent-purple" />
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
      <SectionWrapper>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">
            Ready to upgrade your gym?
          </h2>

          <p className="text-text-secondary mt-4">
            Join hundreds of gym owners scaling with our platform.
          </p>

          <div className="mt-8">
            <button className="px-8 py-4 bg-accent-purple text-white rounded-xl font-semibold hover:opacity-90 transition">
              Get Started
            </button>
          </div>
        </div>
      </SectionWrapper>

    </div>
    </MarketingLayout>
  )
}