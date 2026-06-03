import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

export default function GallerySection({ defaults, content }) {
  const images = content?.gallery_images?.length > 0
    ? content.gallery_images.map((src, i) => ({ id: i, src, alt: '' }))
    : defaults.gallery

  // V3 CMS fix: heading fields are owner-editable (Pro+ via edit_headings).
  // Fall back to canonical defaults so Starter / Solo Coach gyms still get
  // sensible copy without having to set these. KEEP IN SYNC with the
  // placeholders shown in the WebsitePage + StarterWebsitePage GalleryPanel.
  const label    = content?.gallery_label    || 'Inside Look'
  const heading  = (content?.gallery_heading || 'OUR SPACE').toUpperCase()
  const subtitle = content?.gallery_subtitle || 'See the facility where champions are made.'

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}
    >
      <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: "var(--gym-section-py)" }}>
        {/* Header — theme-aware text vars (was hardcoded white before,
            invisible on light-mode surface). */}
        <motion.div variants={fadeUp} className="mb-12 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
              {label}
            </p>
            <h2 className="font-display tracking-wide" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>{heading}</h2>
          </div>
          <p className="text-sm font-sans max-w-xs leading-relaxed" style={{ color: 'var(--gym-text-muted)' }}>
            {subtitle}
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
                className={`group relative overflow-hidden ${rowSpan}`}
                style={{ borderRadius: 'var(--gym-card-radius)' }}
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
