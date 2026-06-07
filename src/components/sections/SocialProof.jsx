import { motion } from 'framer-motion'
import SectionWrapper from '../layout/SectionWrapper'
import GradientText from '../ui/GradientText'
import Card from '../ui/Card'
import { fadeUp } from '../../lib/animations'
import { WHY_GYMMOBIUS } from '../../lib/constants'

function ReasonCard({ reason }) {
  return (
    <Card className="h-full">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-accent-blue">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <div>
          <p className="text-text-primary text-base font-semibold mb-1.5">{reason.title}</p>
          <p className="text-text-secondary text-sm leading-relaxed">{reason.description}</p>
        </div>
      </div>
    </Card>
  )
}

export default function SocialProof() {
  return (
    <SectionWrapper id="why-gymmobius">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.span
          variants={fadeUp}
          className="inline-block text-sm font-medium text-accent-blue uppercase tracking-widest mb-4"
        >
          Why Gymmobius
        </motion.span>
        <GradientText
          as="h2"
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          We're early — here's why that's good for you
        </GradientText>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto"
        >
          No inflated customer counts, no recycled reviews — just what we've actually built and why we built it this way.
        </motion.p>
      </div>

      {/* Reasons grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {WHY_GYMMOBIUS.map((reason) => (
          <ReasonCard key={reason.title} reason={reason} />
        ))}
      </motion.div>
    </SectionWrapper>
  )
}
