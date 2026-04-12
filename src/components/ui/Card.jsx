import { motion } from 'framer-motion'
import { fadeUp, hoverLift } from '../../lib/animations'

export default function Card({
  children,
  className = '',
  glowColor = 'rgba(139, 92, 246, 0.15)',
  hover = true,
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? {
        ...hoverLift,
        boxShadow: `0 0 20px ${glowColor}, 0 10px 20px rgba(0,0,0,0.3)`,
      } : undefined}
      className={`
        relative rounded-2xl p-[1px] overflow-hidden
        bg-gradient-to-br from-border/60 via-transparent to-border/30
        transition-all duration-50
        ${className}
      `}
    >
      <div className="relative rounded-2xl bg-bg-card/80 backdrop-blur-xl p-6 h-full">
        {children}
      </div>
    </motion.div>
  )
}
