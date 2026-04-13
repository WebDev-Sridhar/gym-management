import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring, motion } from 'framer-motion'
import { fadeUp } from '../../../lib/animations'

export default function StatCounter({ value, label }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  // Parse numeric part and suffix (e.g., "500+" → 500, "+")
  const match = value.match(/^(\d+)(.*)$/)
  const target = match ? parseInt(match[1], 10) : 0
  const suffix = match ? match[2] : value

  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const displayRef = useRef(null)

  useEffect(() => {
    if (isInView) {
      motionVal.set(target)
    }
  }, [isInView, target, motionVal])

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = `${Math.round(v)}${suffix}`
      }
    })
    return unsubscribe
  }, [spring, suffix])

  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center">
      <div
        ref={displayRef}
        className="text-3xl sm:text-4xl font-extrabold"
        style={{ color: 'var(--gym-primary)' }}
      >
        {`0${suffix}`}
      </div>
      <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
    </motion.div>
  )
}
