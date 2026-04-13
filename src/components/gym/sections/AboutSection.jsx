import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../../lib/animations'
import StatCounter from '../ui/StatCounter'

export default function AboutSection({ content, defaults }) {
  const heading = defaults.about.heading
  const description = content?.about_text || defaults.about.description
  const stats = defaults.about.stats

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="bg-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {/* Section header */}
        <motion.div variants={fadeUp} className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold tracking-wider uppercase mb-3"
            style={{ color: 'var(--gym-primary)' }}
          >
            About Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            {heading}
          </h2>
          <div className="w-16 h-1 rounded-full mx-auto" style={{ background: 'var(--gym-gradient)' }} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Description */}
          <motion.div variants={fadeUp}>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
              {description}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />
              <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewport}
            className="grid grid-cols-2 gap-6"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
              >
                <StatCounter value={stat.value} label={stat.label} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
