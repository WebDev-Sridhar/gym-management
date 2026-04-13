import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../../lib/animations'
import TestimonialCard from '../TestimonialCard'

export default function TestimonialsSection({ testimonials, defaults, themeColor }) {
  const displayTestimonials = testimonials.length > 0 ? testimonials : defaults.testimonials.fallbackTestimonials

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="bg-gray-50 border-t border-gray-100"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {/* Section header */}
        <motion.div variants={fadeUp} className="text-center mb-14">
          <span
            className="inline-block text-sm font-semibold tracking-wider uppercase mb-3"
            style={{ color: 'var(--gym-primary)' }}
          >
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            {defaults.testimonials.heading}
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            {defaults.testimonials.subtitle}
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTestimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} themeColor={themeColor} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
