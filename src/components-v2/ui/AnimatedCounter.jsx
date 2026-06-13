import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'

// Counts up from 0 to `value` when scrolled into view. `prefix`/`suffix`
// wrap the formatted number (e.g. "10,000+", "₹4.2L", "99.9%").
export default function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 30, stiffness: 80 })
  const rounded = useTransform(spring, (latest) =>
    latest.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
  )

  useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [isInView, value, motionValue])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
