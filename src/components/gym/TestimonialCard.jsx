import { motion } from 'framer-motion'
import { fadeUp, hoverLift } from '../../lib/animations'

export default function TestimonialCard({ testimonial, themeColor }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hoverLift}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 flex flex-col border border-gray-100/80 shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className="w-5 h-5"
            style={{ color: i < testimonial.rating ? (themeColor || 'var(--gym-primary)') : '#D1D5DB' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Quote icon */}
      <svg className="w-8 h-8 mb-3 opacity-10" style={{ color: 'var(--gym-primary, ' + themeColor + ')' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
      </svg>

      {/* Message */}
      <p className="text-gray-600 text-sm leading-relaxed flex-1">
        "{testimonial.message}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ background: 'var(--gym-gradient, ' + themeColor + ')' }}
        >
          {testimonial.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-gray-900 text-sm">{testimonial.name}</span>
      </div>
    </motion.div>
  )
}
