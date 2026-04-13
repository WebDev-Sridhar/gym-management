import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { fadeUp, fadeIn } from '../../../lib/animations'

export default function HeroSection({ gym, content, defaults }) {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const blobY1 = useTransform(scrollYProgress, [0, 1], [0, 120])
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, -80])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 40])

  const slug = gym?.slug
  const title = content?.hero_title || defaults.hero.title
  const subtitle = content?.hero_subtitle || defaults.hero.subtitle
  const badge = defaults.hero.badge

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[85vh] flex items-center"
      style={{ background: 'var(--gym-gradient)' }}
    >
      {/* Parallax decorative blobs */}
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 bg-white"
        style={{ y: blobY1, x: '20%', translateY: '-30%' }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-15 bg-black"
        style={{ y: blobY2, x: '-20%', translateY: '30%' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl opacity-10 bg-white"
        style={{ y: blobY1, x: '-50%', translateY: '-50%' }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />

      <motion.div
        className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40 text-center w-full"
        style={{ y: contentY }}
      >
        {/* Badge */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {badge}
        </motion.div>

        {/* Logo */}
        {gym.logo_url && (
          <motion.img
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            src={gym.logo_url}
            alt={gym.name}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-8 shadow-2xl ring-4 ring-white/20"
          />
        )}

        {/* Title */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
        >
          {title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to={`/${slug}/pricing`}
            className="group inline-flex items-center justify-center px-8 py-4 bg-white font-bold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            style={{ color: 'var(--gym-primary)' }}
          >
            {defaults.hero.primaryCTA.label}
            <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            to={`/${slug}/about`}
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl text-sm backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5"
          >
            {defaults.hero.secondaryCTA.label}
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
