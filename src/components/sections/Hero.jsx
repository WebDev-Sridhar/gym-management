import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { staggerContainer, fadeUp } from '../../lib/animations'
import Button from '../ui/Button'
import FloatingMockup from '../ui/FloatingMockup'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const blobScale = useTransform(scrollYProgress, [0, 1], [1, 0.8])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient Blobs */}
      <motion.div
        style={{ y: blobY, scale: blobScale }}
        className="absolute top-[-10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-accent-purple/15 blur-[120px] pointer-events-none"
      />
      <motion.div
        style={{ y: blobY, scale: blobScale }}
        className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-blue/10 blur-[100px] pointer-events-none"
      />
      <motion.div
        style={{ y: blobY }}
        className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-accent-cyan/5 blur-[80px] pointer-events-none"
      />

      {/* Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 grid lg:grid-cols-2 gap-16 lg:gap-12 items-center w-full"
      >
        {/* Left — Copy */}
        <div className="flex flex-col items-start">
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-purple/10 border border-accent-purple/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
            <span className="text-accent-purple text-sm font-medium">Gym Management, Reimagined</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-[1.1] tracking-tight"
          >
            Run Your Gym Like a{' '}
            <span className="bg-gradient-to-r from-accent-purple via-accent-blue to-accent-cyan bg-clip-text text-transparent">
              Business
            </span>
            , Not a Chaos
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg text-text-secondary leading-relaxed max-w-lg"
          >
            Track members, automate payments, and increase retention — all in one system built for modern gym owners.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap gap-4 mt-10"
          >
            <Button size="lg" href="/signup">Start Free Trial</Button>
            <Button variant="secondary" size="lg" href="#features">See How It Works</Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-6 mt-12 text-text-muted text-sm"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              500+ gyms
            </span>
          </motion.div>
        </div>

        {/* Right — Mockup */}
        <motion.div variants={fadeUp} className="flex justify-center lg:justify-end">
          <FloatingMockup />
        </motion.div>
      </motion.div>
    </section>
  )
}
