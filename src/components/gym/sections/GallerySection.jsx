import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

export default function GallerySection({ defaults }) {
  const images = defaults.gallery

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-24">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-12 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
              Inside Look
            </p>
            <h2 className="font-display text-white text-5xl sm:text-6xl tracking-wide">OUR SPACE</h2>
          </div>
          <p className="text-white/40 text-sm font-sans max-w-xs leading-relaxed">
            See the facility where champions are made.
          </p>
        </motion.div>

        {/* Masonry grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[180px] sm:auto-rows-[220px]">
          {images.map((img, i) => {
            // Make some images span 2 rows for masonry feel
            const rowSpan = i === 1 || i === 4 ? 'row-span-2' : 'row-span-1'
            return (
              <motion.div
                key={img.id}
                variants={fadeUp}
                className={`group relative overflow-hidden rounded-xl ${rowSpan}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-400"
                  style={{ background: 'var(--gym-gradient)' }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
