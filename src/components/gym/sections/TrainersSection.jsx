import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../../lib/animations'
import TrainerCard from '../TrainerCard'

export default function TrainersSection({ gym, trainers, defaults, themeColor }) {
  const displayTrainers = trainers.length > 0 ? trainers : defaults.trainers.fallbackTrainers
  const slug = gym?.slug

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
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span
            className="inline-block text-sm font-semibold tracking-wider uppercase mb-3"
            style={{ color: 'var(--gym-primary)' }}
          >
            Our Team
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            {defaults.trainers.heading}
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            {defaults.trainers.subtitle}
          </p>
        </motion.div>

        {/* Trainers grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTrainers.slice(0, 3).map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} themeColor={themeColor} />
          ))}
        </div>

        {/* View all link */}
        {trainers.length > 3 && (
          <motion.div variants={fadeUp} className="text-center mt-10">
            <Link
              to={`/${slug}/trainers`}
              className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--gym-primary)' }}
            >
              View all trainers
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}
