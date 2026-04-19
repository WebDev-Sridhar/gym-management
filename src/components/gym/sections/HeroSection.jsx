import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function HeroSection({ gym, content, defaults }) {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.1, 0.9])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const slug = gym?.slug
  const title = content?.hero_title || defaults.hero.title
  const subtitle = content?.hero_subtitle || defaults.hero.subtitle
  const bgImage = content?.hero_image || defaults.hero.backgroundImage
  const titleLines = title.split('\n')

  return (
    <section
      ref={sectionRef}
      data-force-white
      className="relative w-full overflow-hidden"
      style={{ height: '100svh', minHeight: '640px' }}
    >
      {/* Background image with parallax + Ken Burns */}
<motion.div
  className="absolute inset-0"
  style={{ y: bgY, scale: bgScale }}
>
  <motion.div
    className="absolute inset-0 bg-cover bg-center"
    style={{ 
      backgroundImage: `url(${bgImage})`,
      // Add a slight blur that clears up to make it feel extra "focused"
      filter: 'brightness(0.9)' 
    }}
    animate={{ 
      scale: [1.15, 1],
      filter: ['brightness(0.7)', 'brightness(0.9)'] 
    }}
    transition={{ 
      duration: 10, 
      ease: [0.33, 1, 0.68, 1], // Custom cubic-bezier for smoother feel
      repeat: Infinity, 
      repeatType: 'reverse' 
    }}
  />
</motion.div>

      {/* Dark overlays — layered for depth */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85) 100%)' }} />
      {/* Gym gradient tint at very low opacity */}
      <div className="absolute inset-0 opacity-20" style={{ background: 'var(--gym-gradient-diagonal)' }} />

      {/* Content with parallax */}
      <motion.div
        className="absolute inset-0 flex flex-col items-start justify-end pb-20 px-6 sm:px-12 lg:px-16"
        style={{ y: contentY, opacity }}
      >
        <div className="max-w-5xl w-full">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border text-xs font-bold tracking-[0.15em] uppercase font-sans"
            style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {gym?.name ? `${gym.name} · ${defaults.hero.badge}` : defaults.hero.badge}
          </motion.div>

          {/* Massive display title */}
          <div className="overflow-hidden mb-6">
            {titleLines.map((line, i) => (
              <motion.h1
                key={i}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ delay: 0.35 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-white leading-none tracking-wider block"
                style={{ fontSize: 'var(--gym-h1-size, clamp(3.5rem, 9vw, 8rem))' }}
              >
                {line}
              </motion.h1>
            ))}
          </div>

          {/* Subtitle + CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
          >
            <p className="text-white/55 text-base sm:text-lg font-sans max-w-md leading-relaxed">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                to={`/${slug}/pricing`}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold rounded-xl text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl font-sans"
                style={{ background: 'var(--gym-gradient)', boxShadow: '0 8px 30px var(--gym-glow-strong)' }}
              >
                {defaults.hero.primaryCTA.label}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to={`/${slug}/trainers`}
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold rounded-xl text-white border border-white/20 hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5 font-sans"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                {defaults.hero.secondaryCTA.label}
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 right-8 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="w-px h-12 origin-top"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)' }}
        />
        <span className="text-white/30 text-[10px] tracking-[0.2em] font-sans uppercase" style={{ writingMode: 'vertical-rl' }}>Scroll</span>
      </motion.div>

      {/* Bottom edge gradient to blend into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: `linear-gradient(to top, var(--gym-bg), transparent)` }} />
    </section>
  )
}
