import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport } from '../../lib/animations'

export default function SectionWrapper({ children, className = '', id }) {
  return (
    <motion.section
      id={id}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className={`relative max-w-7xl mx-auto px-6 py-24 md:py-32 ${className}`}
    >
      {children}
    </motion.section>
  )
}
