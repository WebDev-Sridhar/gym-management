import { motion } from 'framer-motion'
import { fadeUp } from '../../lib/animations'

export default function GradientText({ children, className = '', as = 'h2' }) {
  const Tag = motion[as]

  return (
    <Tag
      variants={fadeUp}
      className={`
        bg-gradient-to-r from-accent-purple via-accent-blue to-accent-cyan
        bg-clip-text text-transparent
        ${className}
      `}
    >
      {children}
    </Tag>
  )
}
