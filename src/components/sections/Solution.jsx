import { motion } from 'framer-motion'
import SectionWrapper from '../layout/SectionWrapper'
import GradientText from '../ui/GradientText'
import { fadeUp, slideInLeft, slideInRight, scrollViewport } from '../../lib/animations'
import { SOLUTIONS } from '../../lib/constants'

function CheckIcon() {
  return (
    <div className="w-6 h-6 rounded-full bg-accent-purple/15 flex items-center justify-center shrink-0 mt-0.5">
      <svg className="w-3.5 h-3.5 text-accent-purple" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

function SolutionVisual() {
  return (
    <motion.div
      variants={slideInRight}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="relative"
    >
      {/* Glow */}
      <div className="absolute -inset-6 bg-accent-blue/8 blur-3xl rounded-full" />

      {/* Visual card */}
      <div className="relative bg-bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden p-6">
        {/* Workflow visualization */}
        <div className="space-y-4">
          {/* Step indicators */}
          {[
            { step: '01', label: 'Member scans QR', color: 'from-accent-purple to-accent-blue' },
            { step: '02', label: 'Attendance auto-logged', color: 'from-accent-blue to-accent-cyan' },
            { step: '03', label: 'Analytics updated in real-time', color: 'from-accent-cyan to-green-400' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              className="flex items-center gap-4 bg-surface/60 rounded-xl p-4"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{item.step}</span>
              </div>
              <div className="flex-1">
                <span className="text-text-primary text-sm font-medium">{item.label}</span>
                <div className="mt-2 h-1.5 bg-border/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.2, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function Solution() {
  return (
    <SectionWrapper>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
        {/* Left — Text */}
        <motion.div
          variants={slideInLeft}
          initial="hidden"
          whileInView="visible"
          viewport={scrollViewport}
        >
          <span className="inline-block text-sm font-medium text-accent-purple uppercase tracking-widest mb-4">
            The Solution
          </span>
          <GradientText
            as="h2"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6"
          >
            One Platform. Zero Chaos.
          </GradientText>
          <p className="text-text-secondary text-lg mb-8 leading-relaxed">
            GymOS replaces your spreadsheets, WhatsApp reminders, and guesswork with a single intelligent system.
          </p>

          <div className="space-y-5">
            {SOLUTIONS.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="flex gap-3"
              >
                <CheckIcon />
                <div>
                  <h4 className="text-text-primary font-semibold text-base">{item.title}</h4>
                  <p className="text-text-muted text-sm mt-1 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — Visual */}
        <SolutionVisual />
      </div>
    </SectionWrapper>
  )
}
