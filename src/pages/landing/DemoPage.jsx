import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import { fadeUp } from '../../lib/animations'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function DemoPage() {
  return (
    <MarketingLayout>
    <div className="relative overflow-hidden">

      <SectionWrapper>
        <div className="text-center max-w-2xl mx-auto">

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-extrabold text-text-primary"
          >
            See Gymmobius in Action
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-text-secondary"
          >
            Book a live demo and discover how you can automate operations,
            increase retention, and grow your gym faster.
          </motion.p>

          <div className="mt-10">
            <button className="px-8 py-4 bg-accent-purple text-white rounded-xl font-semibold">
              Book a Demo
            </button>
          </div>

        </div>
      </SectionWrapper>

    </div>
    </MarketingLayout>
  )
}