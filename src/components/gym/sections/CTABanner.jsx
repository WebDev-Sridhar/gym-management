import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../../lib/animations'

export default function CTABanner({ gym, defaults }) {
  const slug = gym?.slug

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="bg-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <motion.div
          variants={fadeUp}
          className="relative rounded-3xl px-8 sm:px-12 py-16 sm:py-20 text-center overflow-hidden"
          style={{ background: 'var(--gym-gradient)' }}
        >
          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl opacity-15" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-white rounded-full blur-3xl opacity-10" />
          </div>

          {/* Noise overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />

          <div className="relative">
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight"
            >
              {defaults.cta.heading}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-white/80 mb-8 max-w-md mx-auto text-lg"
            >
              {defaults.cta.subtitle}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link
                to={`/${slug}/pricing`}
                className="group inline-flex items-center justify-center px-8 py-4 bg-white font-bold rounded-xl text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                style={{ color: 'var(--gym-primary)' }}
              >
                {defaults.cta.buttonLabel}
                <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
