import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-indigo-600',
  secondary:
    'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md',
  ghost:
    'bg-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100',
}

const SIZES = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

// Magnetic button — nudges toward the cursor on hover, springs back on leave.
export default function Button({
  as = 'button',
  variant = 'primary',
  size = 'md',
  magnetic = true,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 })
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 })

  function handleMouseMove(e) {
    if (!magnetic || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    x.set(relX * 0.25)
    y.set(relY * 0.25)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const MotionTag = motion[as] ?? motion.button

  return (
    <MotionTag
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.96 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
