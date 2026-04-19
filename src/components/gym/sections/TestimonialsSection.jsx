import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

function TestimonialCard({ t }) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl p-7 flex flex-col h-full"
      style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
      whileHover={{ y: -4, borderColor: 'var(--gym-border-strong)' }}
      transition={{ duration: 0.3 }}
    >
      {/* Quote mark */}
      <svg className="w-10 h-10 mb-4 opacity-20" style={{ color: 'var(--gym-primary)' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
      </svg>

      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-4 h-4" style={{ color: i < t.rating ? 'var(--gym-primary)' : 'var(--gym-border-strong)' }} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      <p className="text-white/65 text-sm font-sans leading-relaxed flex-1 mb-6">
        "{t.message}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid var(--gym-border)' }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: 'var(--gym-gradient)' }}
        >
          {t.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white text-sm font-semibold font-sans">{t.name}</p>
          {t.role && <p className="text-white/35 text-xs font-sans mt-0.5">{t.role}</p>}
        </div>
      </div>
    </motion.div>
  )
}

export default function TestimonialsSection({ testimonials, defaults }) {
  const displayTestimonials = testimonials.length > 0 ? testimonials : defaults.testimonials.fallbackTestimonials
  const titleLines = defaults.testimonials.heading.split('\n')

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-bg)', borderTop: '1px solid var(--gym-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-24">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-14 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>
            Testimonials
          </p>
          <h2 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)' }}>
            {titleLines.map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h2>
          <p className="text-white/40 text-sm font-sans mt-4">{defaults.testimonials.subtitle}</p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {displayTestimonials.map(t => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
