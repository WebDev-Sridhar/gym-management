import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

export default function CTABanner({ gym, content, defaults }) {
  const slug = gym?.slug
  const heading = content?.cta_home || content?.cta_text || defaults.cta.heading

  return (
    <motion.section
      data-force-white
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="relative overflow-hidden"
      style={{ background: 'var(--gym-gradient-diagonal)' }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px'
        }}
      />
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 bg-white" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-15 bg-white" />

      <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
        <motion.p
          variants={fadeUp}
          className="text-xs font-bold tracking-[0.3em] uppercase mb-4 text-white/60 font-sans"
        >
          {defaults.cta.preHeading}
        </motion.p>

        <motion.h2
          variants={fadeUp}
          className="font-display text-white tracking-widest leading-none mb-8"
          style={{ fontSize: 'clamp(4rem, 12vw, 10rem)' }}
        >
          {heading}
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="text-white/65 text-base sm:text-lg font-sans mb-10 max-w-lg mx-auto leading-relaxed"
        >
          {defaults.cta.subtitle}
        </motion.p>

        <motion.div variants={fadeUp}>
          <Link
            to={`/${slug}/pricing`}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white rounded-xl font-bold text-sm font-sans transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ color: 'var(--gym-primary)' }}
          >
            {defaults.cta.buttonLabel}
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}
