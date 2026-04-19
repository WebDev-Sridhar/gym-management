import { motion } from 'framer-motion'
import { fadeUp } from '../../lib/animations'

export default function TestimonialCard({ testimonial }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
    >
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-4 h-4" style={{ color: i < testimonial.rating ? 'var(--gym-primary)' : 'var(--gym-border-strong)' }} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      <p className="text-white/60 text-sm font-sans leading-relaxed flex-1 mb-5">"{testimonial.message}"</p>

      <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--gym-border)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: 'var(--gym-gradient)' }}>
          {testimonial.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white text-sm font-semibold font-sans">{testimonial.name}</p>
          {testimonial.role && <p className="text-white/35 text-xs font-sans">{testimonial.role}</p>}
        </div>
      </div>
    </motion.div>
  )
}
