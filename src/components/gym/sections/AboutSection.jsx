import { motion } from 'framer-motion'
import { Dumbbell, Award, Target, Users, Check } from 'lucide-react'
import { staggerContainer, scrollViewport, fadeUp, slideInLeft, slideInRight } from '../../../lib/animations'
import StatCounter from '../ui/StatCounter'

const ICON_MAP = { dumbbell: Dumbbell, award: Award, target: Target, users: Users, check: Check }
const FallbackIcon = Check

export default function AboutSection({ content, defaults }) {
  const description = content?.about_text || defaults.about.description
  const image       = content?.about_image || defaults.about.image

  // Use CMS stats if set, else defaults
  const stats = (content?.stats?.length ? content.stats : defaults.stats).slice(0, 4)

  // Use CMS why_us if set, else default features
  // why_us: [{ title, description }], features: [{ icon, text }]
  const whyUs = content?.why_us?.length
    ? content.why_us.slice(0, 4).map(w => ({ icon: 'check', text: `${w.title}${w.description ? ' — ' + w.description : ''}` }))
    : defaults.about.features

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: Text content */}
          <div>
            <motion.p
              variants={fadeUp}
              className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans"
              style={{ color: 'var(--gym-primary)' }}
            >
              {defaults.about.superLabel}
            </motion.p>
            <motion.h2
              variants={slideInLeft}
              className="font-display text-white tracking-wide leading-none mb-8"
              style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}
            >
              {defaults.about.heading.toUpperCase()}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-white/55 text-base sm:text-lg leading-relaxed mb-10 font-sans"
            >
              {description}
            </motion.p>

            {/* Feature list */}
            <motion.ul variants={staggerContainer} className="space-y-4">
              {whyUs.map((feat, i) => {
                const Icon = ICON_MAP[feat.icon] ?? FallbackIcon
                return (
                  <motion.li key={i} variants={fadeUp} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--gym-glow)', border: '1px solid var(--gym-border-strong)' }}>
                      <Icon size={18} style={{ color: 'var(--gym-primary)' }} strokeWidth={1.75} />
                    </div>
                    <span className="text-white/70 text-sm font-sans leading-relaxed pt-2">{feat.text}</span>
                  </motion.li>
                )
              })}
            </motion.ul>
          </div>

          {/* Right: Image + Stats */}
          <div className="flex flex-col gap-6">
            {/* Image */}
            <motion.div
              variants={slideInRight}
              className="relative rounded-2xl overflow-hidden"
              style={{ aspectRatio: '4/5' }}
            >
              <motion.img
                src={image}
                alt="About"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 opacity-10" style={{ background: 'var(--gym-gradient)', mixBlendMode: 'color' }} />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
            </motion.div>

            {/* Inline stats */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map(stat => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="rounded-xl p-5"
                  style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)' }}
                >
                  <StatCounter value={stat.value} label={stat.label} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
