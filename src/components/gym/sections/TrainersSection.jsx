import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

function TiltCard({ trainer }) {
  const handleTilt = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -14
    card.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) scale(1.03)`
    card.style.transition = 'transform 0.1s ease-out'
  }
  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)'
    e.currentTarget.style.transition = 'transform 0.6s ease'
  }

  return (
    <motion.div
      variants={fadeUp}
      onMouseMove={handleTilt}
      onMouseLeave={handleTiltLeave}
      className="group rounded-2xl overflow-hidden relative cursor-pointer"
      style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', willChange: 'transform' }}
    >
      {/* Image area */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {trainer.image_url ? (
          <img
            src={trainer.image_url}
            alt={trainer.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--gym-surface)' }}>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-display"
              style={{ background: 'var(--gym-gradient)' }}
            >
              {trainer.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%)' }} />
        {/* Gym color accent on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'var(--gym-gradient)' }} />
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-white tracking-wider text-xl">{trainer.name.toUpperCase()}</h3>
            {trainer.specialization && (
              <p className="text-xs font-bold tracking-[0.12em] uppercase mt-1 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {trainer.specialization}
              </p>
            )}
          </div>
          {/* Arrow icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 -translate-x-2"
            style={{ background: 'var(--gym-gradient)' }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
        {trainer.bio && (
          <p className="text-white/45 text-sm font-sans leading-relaxed mt-3 line-clamp-2">{trainer.bio}</p>
        )}
      </div>
    </motion.div>
  )
}

export default function TrainersSection({ gym, trainers, defaults }) {
  const displayTrainers = trainers.length > 0 ? trainers : defaults.trainers.fallbackTrainers
  const slug = gym?.slug

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-24">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-14 flex items-end justify-between flex-wrap gap-6">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
              Expert Coaches
            </p>
            <h2 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
              {defaults.trainers.heading}
            </h2>
          </div>
          <p className="text-white/40 text-sm font-sans max-w-xs leading-relaxed">
            {defaults.trainers.subtitle}
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayTrainers.slice(0, 3).map(trainer => (
            <TiltCard key={trainer.id} trainer={trainer} />
          ))}
        </div>

        {/* View all */}
        {trainers.length > 3 && (
          <motion.div variants={fadeUp} className="mt-10 text-center">
            <Link
              to={`/${slug}/trainers`}
              className="inline-flex items-center gap-2 text-sm font-semibold font-sans transition-all hover:gap-3"
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
