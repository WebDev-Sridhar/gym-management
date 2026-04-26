import { motion } from 'framer-motion'
import { fadeUp } from '../../lib/animations'

export default function TrainerCard({ trainer }) {
  const handleTilt = (e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12
    el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) scale(1.03)`
    el.style.transition = 'transform 0.1s ease-out'
  }
  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale(1)'
    e.currentTarget.style.transition = 'transform 0.5s ease'
  }

  return (
    <motion.div
      variants={fadeUp}
      onMouseMove={handleTilt}
      onMouseLeave={handleTiltLeave}
      className="group overflow-hidden"
      style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)', boxShadow: 'var(--gym-shadow)', willChange: 'transform' }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-display"
              style={{ background: 'var(--gym-gradient)' }}
            >
              {trainer.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: 'var(--gym-gradient)' }} />
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-display text-white tracking-wider text-xl">{trainer.name.toUpperCase()}</h3>
        {trainer.specialization && (
          <p className="text-xs font-bold tracking-[0.15em] uppercase mt-1 font-sans" style={{ color: 'var(--gym-primary)' }}>
            {trainer.specialization}
          </p>
        )}
        {trainer.bio && (
          <p className="text-white/45 text-sm font-sans leading-relaxed mt-3 line-clamp-2">{trainer.bio}</p>
        )}
      </div>
    </motion.div>
  )
}
