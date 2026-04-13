import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport } from '../../../lib/animations'

const bgStyles = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  gradient: '',
}

export default function AnimatedSection({ children, className = '', id, bg = 'white', style }) {
  return (
    <motion.section
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className={`${bgStyles[bg] || ''} ${className}`}
      style={style}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {children}
      </div>
    </motion.section>
  )
}
