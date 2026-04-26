import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function HeroC({ data }) {
  const sectionRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])

  // ✅ NEW: normalized data
  const title = data.title
  const subtitle = data.subtitle
  const bgImage = data.backgroundImage
  const titleLines = title.split('\n')

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100svh', minHeight: '640px' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">

        {/* LEFT CONTENT */}
        <motion.div
          style={{ y: contentY }}
          className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-[#0a0a0a]"
        >
          {/* Badge */}
          <div className="mb-6 text-white/60 text-xs tracking-widest uppercase">
            {data.badge}
          </div>

          {/* Title */}
          <div className="overflow-hidden">
            {titleLines.map((line, i) => (
              <motion.h1
                key={i}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-white font-display leading-none"
                style={{ fontSize: 'calc(var(--gym-h1-size, clamp(2.8rem, 5vw, 5rem)) * 0.72)', overflowWrap: 'break-word', wordBreak: 'break-word' }}
              >
                {line}
              </motion.h1>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-white/60 max-w-md"
          >
            {subtitle}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex gap-4"
          >
            <Link
              to={data.primaryCTA.link}
              className="px-8 py-4 font-bold text-white"
              style={{
                background: 'var(--gym-gradient)',
                borderRadius: 'var(--gym-card-radius)'
              }}
            >
              {data.primaryCTA.label}
            </Link>

            <Link
              to={data.secondaryCTA.link}
              className="px-8 py-4 font-bold text-white border border-white/20"
              style={{ borderRadius: 'var(--gym-card-radius)' }}
            >
              {data.secondaryCTA.label}
            </Link>
          </motion.div>
        </motion.div>

        {/* RIGHT IMAGE */}
        <motion.div
  style={{ y: imageY }}
  className="relative lg:block h-full"
>
  <div
    className="absolute inset-0 w-full h-full bg-cover bg-center"
    style={{
      backgroundImage: `url(${bgImage})`
    }}
  />

  {/* Gradient overlay */}
  <div
    className="
      absolute bottom-0 left-0 right-0
      h-full
      bg-gradient-to-t from-black/90 via-black/40 to-transparent

      md:inset-0 md:h-auto md:bg-gradient-to-l md:from-black/80 md:via-black/30 md:to-transparent
    "
  />
</motion.div>
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.8 }}
  className="
    absolute z-10
    bottom-4 right-4
    sm:bottom-6 sm:right-6
    md:bottom-8 md:right-8
    max-w-[70%] sm:max-w-sm
  "
>
  {data.imageDescription && (
  <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
    {data.imageDescription}
  </p>
  )}
</motion.div>

      </div>
            {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-10 left-8 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-12 origin-top"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)'
          }}
        />
        <span className="text-white/30 text-[10px] tracking-[0.2em] font-sans uppercase" style={{ writingMode: 'sideways-lr' }}>
          Scroll
        </span>
      </motion.div>
    </section>
  )
}