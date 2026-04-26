import { motion } from 'framer-motion'
import SectionWrapper from '../../components/layout/SectionWrapper'
import { fadeUp } from '../../lib/animations'
    import MarketingLayout from '../../components/layout/MarketingLayout'

export default function AboutPage() {
  return (
    <MarketingLayout>
    <div className="relative overflow-hidden">

      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-text-primary">
            Built for Modern Gym Owners
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 text-text-secondary">
            Gymmobius is designed to simplify operations, automate workflows, and help gym owners focus on growth — not manual tasks.
          </motion.p>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Our Mission</h3>
            <p className="text-text-muted">
              To empower gyms with powerful, easy-to-use technology that improves member experience and drives retention.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Our Vision</h3>
            <p className="text-text-muted">
              To become the operating system for fitness businesses worldwide.
            </p>
          </div>
        </div>
      </SectionWrapper>

    </div>
    </MarketingLayout>
  )
}