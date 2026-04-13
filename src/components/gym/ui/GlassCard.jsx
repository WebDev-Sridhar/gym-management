import { motion } from 'framer-motion'
import { fadeUp, hoverLift } from '../../../lib/animations'

export default function GlassCard({ children, className = '', ...props }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hoverLift}
      className={`bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg transition-shadow hover:shadow-xl ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
