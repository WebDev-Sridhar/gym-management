import { motion } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import SectionWrapper from '../layout/SectionWrapper'
import GradientText from '../ui/GradientText'
import { fadeUp } from '../../lib/animations'
import { TESTIMONIALS } from '../../lib/constants'

function TestimonialCard({ testimonial }) {
  return (
    <div className="min-w-[320px] sm:min-w-[380px] p-[1px] rounded-2xl bg-gradient-to-br from-border/50 via-transparent to-border/20 shrink-0">
      <div className="bg-bg-card/80 backdrop-blur-xl rounded-2xl p-6 h-full flex flex-col">
        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        {/* Quote */}
        <p className="text-text-secondary text-sm leading-relaxed flex-1 mb-6">
          "{testimonial.quote}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
            <span className="text-white text-xs font-bold">{testimonial.initials}</span>
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">{testimonial.name}</p>
            <p className="text-text-muted text-xs">{testimonial.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SocialProof() {
  const scrollRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let animationId
    const speed = 0.5

    function scroll() {
      if (!isPaused && container) {
        container.scrollLeft += speed
        // Reset to start for infinite loop
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0
        }
      }
      animationId = requestAnimationFrame(scroll)
    }

    animationId = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(animationId)
  }, [isPaused])

  // Double the testimonials for infinite scroll effect
  const doubledTestimonials = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <SectionWrapper id="testimonials">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.span
          variants={fadeUp}
          className="inline-block text-sm font-medium text-accent-blue uppercase tracking-widest mb-4"
        >
          Testimonials
        </motion.span>
        <GradientText
          as="h2"
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          Trusted by 500+ Gym Owners
        </GradientText>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto"
        >
          Don't take our word for it. Here's what gym owners have to say.
        </motion.p>
      </div>

      {/* Carousel */}
      <motion.div variants={fadeUp} className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="flex gap-5 overflow-x-hidden py-2"
        >
          {doubledTestimonials.map((testimonial, i) => (
            <TestimonialCard key={`${testimonial.name}-${i}`} testimonial={testimonial} />
          ))}
        </div>
      </motion.div>
    </SectionWrapper>
  )
}
