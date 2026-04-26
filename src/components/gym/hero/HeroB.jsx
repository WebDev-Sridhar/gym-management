import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function HeroB({ data }) {
  const sectionRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  })

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '10%'])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  // ✅ NEW: normalized data
  const title = data.title
  const subtitle = data.subtitle
  const bgImage = data.backgroundImage

  return (
    <section
      ref={sectionRef}
      className="relative w-full flex items-center justify-center text-center overflow-hidden"
      style={{ height: '100svh', minHeight: '640px' }}
    >
      {/* Background */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          scale: bgScale,
          filter: 'brightness(0.6)'
        }}
      />

      {/* Soft gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0.3), rgba(0,0,0,0.85))'
        }}
      />
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


      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity }}
        className="relative z-10 max-w-4xl px-6"
      >
           <div className="mb-4 text-white/60 text-xs tracking-widest uppercase">
            {data.badge}
          </div>
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-white font-display leading-tight"
          style={{ fontSize: 'calc(var(--gym-h1-size, clamp(3rem, 7vw, 7rem)) * 0.78)', overflowWrap: 'break-word', wordBreak: 'break-word' }}
        >
          {title.split('\n').map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-white/70 text-lg max-w-xl mx-auto"
        >
          {subtitle}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link
            to={data.primaryCTA.link}
            className="px-8 py-4 font-bold text-white transition-all hover:-translate-y-1"
            style={{
              background: 'var(--gym-gradient)',
              borderRadius: 'var(--gym-card-radius)',
              boxShadow: '0 10px 30px var(--gym-glow-strong)'
            }}
          >
            {data.primaryCTA.label}
          </Link>

          <Link
            to={data.secondaryCTA.link}
            className="px-8 py-4 font-bold text-white border border-white/20 hover:bg-white/10 transition-all"
            style={{ borderRadius: 'var(--gym-card-radius)' }}
          >
            {data.secondaryCTA.label}
          </Link>
        </motion.div>
        
      </motion.div>
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