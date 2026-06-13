import { motion } from 'framer-motion'

export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

// Generic scroll-triggered reveal. Wrap any section/element content; fires
// once when ~20% of the element enters the viewport.
export default function ScrollReveal({ as = 'div', variant = fadeUp, delay = 0, className, children, ...rest }) {
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variant}
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

// Stagger wrapper — children should use ScrollReveal's variants (e.g. fadeUp)
// directly as motion.div variants without their own viewport trigger.
export function StaggerGroup({ as = 'div', className, children, ...rest }) {
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function StaggerItem({ as = 'div', variant = fadeUp, className, children, ...rest }) {
  const MotionTag = motion[as] ?? motion.div
  return (
    <MotionTag variants={variant} className={className} {...rest}>
      {children}
    </MotionTag>
  )
}
