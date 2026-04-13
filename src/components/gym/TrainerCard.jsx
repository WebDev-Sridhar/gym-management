import { motion } from 'framer-motion'
import { fadeUp, hoverLift } from '../../lib/animations'

export default function TrainerCard({ trainer, themeColor }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hoverLift}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden group">
        {trainer.image_url ? (
          <img
            src={trainer.image_url}
            alt={trainer.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
              style={{ background: 'var(--gym-gradient, ' + themeColor + ')' }}
            >
              {trainer.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {/* Gradient overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{ background: 'var(--gym-gradient)' }}
        />
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg">{trainer.name}</h3>
        {trainer.specialization && (
          <p
            className="text-sm font-semibold mt-1"
            style={{ color: 'var(--gym-primary, ' + themeColor + ')' }}
          >
            {trainer.specialization}
          </p>
        )}
        {trainer.bio && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">{trainer.bio}</p>
        )}
      </div>
    </motion.div>
  )
}
