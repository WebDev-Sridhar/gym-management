import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'
import TestimonialCard from '../TestimonialCard'
import { useState, useEffect, useRef } from 'react'

export default function TestimonialsSection({ testimonials, defaults, content }) {
  const displayTestimonials =
    testimonials.length > 0
      ? testimonials
      : defaults.testimonials.fallbackTestimonials

  const rawHeading =
    content?.testimonials_heading || defaults.testimonials.heading

  const titleLines = rawHeading.split('\n')

  const [index, setIndex] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [containerW, setContainerW] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const wrapperRef = useRef(null)
  const touchStartX = useRef(null)

  // Track breakpoint
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Measure container width via ResizeObserver for pixel-perfect math
  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Reset to 0 whenever layout changes
  useEffect(() => {
    setIndex(0)
  }, [isDesktop])

  const itemsPerView = isDesktop ? 3 : 1
  const gap = 16 // px
  const total = displayTestimonials.length
  const maxIndex = Math.max(0, total - itemsPerView)

  // cardWidth = (containerW - gap * (N-1)) / N
  // shiftPx per step = cardWidth + gap
  const cardWidth = containerW > 0
    ? (containerW - gap * (itemsPerView - 1)) / itemsPerView
    : 0
  const shiftPx = index * (cardWidth + gap)

  const next = () => setIndex((p) => Math.min(p + 1, maxIndex))
  const prev = () => setIndex((p) => Math.max(p - 1, 0))

  // ── Touch / swipe handlers (mobile only) ──────────────────────────────
  const SWIPE_THRESHOLD = 50 // px needed to commit a slide

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
    setDragOffset(0)
  }

  const onTouchMove = (e) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    setDragOffset(delta)
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    if (dragOffset < -SWIPE_THRESHOLD) next()
    else if (dragOffset > SWIPE_THRESHOLD) prev()
    setDragOffset(0)
    touchStartX.current = null
  }

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{
        background: 'var(--gym-bg)',
        borderTop: '1px solid var(--gym-border)',
      }}
    >
      <div
        className="max-w-7xl mx-auto"
        style={{ paddingBlock: 'var(--gym-section-py)', paddingInline: '1.5rem' }}
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-14 text-center">
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans"
            style={{ color: 'var(--gym-primary)' }}
          >
            {content?.testimonials_label || 'Testimonials'}
          </p>

          <h2
            className="font-display text-white tracking-wide leading-none"
            style={{ fontSize: 'var(--gym-h2-size)' }}
          >
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h2>

          <p className="text-white/40 text-sm font-sans mt-4">
            {content?.testimonials_subtitle ||
              defaults.testimonials.subtitle}
          </p>
        </motion.div>

        {/* Slider */}
        <div
          style={{
            position: 'relative',
            borderRadius: '18px',
            padding: isDesktop ? '24px 32px' : '16px',
          }}
        >
          {/* Overflow clip — paddingTop gives room for the card hover lift */}
          <div
            ref={wrapperRef}
            style={{ overflow: 'hidden', backgroundColor: 'var(--gym-bg)' }}
            className='px-4 rounded-lg py-8'
            onTouchStart={!isDesktop ? onTouchStart : undefined}
            onTouchMove={!isDesktop ? onTouchMove : undefined}
            onTouchEnd={!isDesktop ? onTouchEnd : undefined}
          >

            <div
              style={{
                display: 'flex',
                gap: `${gap}px`,
                transform: `translateX(${-shiftPx + dragOffset}px)`,
                transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                willChange: 'transform',
                touchAction: 'pan-y', // allow vertical scroll, capture horizontal
              }}
            >
              {displayTestimonials.map((t) => (
                <div
                  key={t.id}
                  style={{
                    flex: `0 0 ${cardWidth}px`,
                    minWidth: 0,
                  }}
                >
                  <TestimonialCard testimonial={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Left Arrow */}
          {index > 0 && (
            <button
              onClick={prev}
              aria-label="Previous testimonials"
              style={{
                position: 'absolute',
                left: '-16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.13)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.2s',
                boxShadow: 'var(--gym-shadow)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--gym-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Arrow */}
          {index < maxIndex && (
            <button
              onClick={next}
              aria-label="Next testimonials"
              style={{
                position: 'absolute',
                right: '-16px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.13)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.2s',
                boxShadow: 'var(--gym-shadow)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--gym-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Dot indicators */}
          {maxIndex > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '32px',
            }}>
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  style={{
                    width: i === index ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: i === index
                      ? 'var(--gym-primary)'
                      : 'var(--gym-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}