import { motion } from 'framer-motion'
import { Dumbbell, Award, Target, Users } from 'lucide-react'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

const ICONS = [Dumbbell, Award, Target, Users]

const DEFAULTS = [
  { title: 'World-Class Equipment', description: 'Over 200 pieces of premium equipment, updated every year. Everything you need to crush your goals.' },
  { title: 'Expert Coaching',       description: 'Every trainer is certified and passionate. We match you to a coach who fits your style and goals.' },
  { title: 'Proven Programs',       description: '50+ structured classes per week — from beginner-friendly to elite athlete training.' },
  { title: 'Real Community',        description: 'Over 500 members who push each other to be better. Join a tribe that celebrates every milestone.' },
]

export default function WhyUsSection({ content }) {
  // Per-item fallback: use CMS value if set, else default — never blank
  const items = Array.from({ length: 4 }, (_, i) => {
    const cms = content?.why_us?.[i]
    return {
      title:       cms?.title?.trim()       || DEFAULTS[i].title,
      description: cms?.description?.trim() || DEFAULTS[i].description,
    }
  })

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{
        background: 'var(--gym-surface)',
        borderTop: '1px solid var(--gym-border)',
        borderBottom: '1px solid var(--gym-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: 'var(--gym-section-py)' }}>
        <motion.div variants={fadeUp} className="mb-14 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
            {content?.why_us_label || 'Why Us'}
          </p>
          <h2 className="font-display tracking-wide" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>
            {(content?.why_us_heading || 'WHY CHOOSE US').toUpperCase()}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {items.slice(0, 4).map((item, i) => {
            const Icon = ICONS[i]
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className="p-7"
                style={{
                  background: 'var(--gym-card)',
                  border: '1px solid var(--gym-border)',
                  borderRadius: 'var(--gym-card-radius)',
                  boxShadow: 'var(--gym-shadow)',
                }}
                whileHover={{ y: -3, borderColor: 'var(--gym-border-strong)' }}
                transition={{ duration: 0.3 }}
              >
                {Icon && (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'var(--gym-glow)', border: '1px solid var(--gym-border-strong)' }}
                  >
                    <Icon size={20} style={{ color: 'var(--gym-primary)' }} strokeWidth={1.75} />
                  </div>
                )}
                <h3
                  className="font-display tracking-wider text-xl mb-2"
                  style={{ color: 'var(--gym-text)' }}
                >
                  {(item.title || '').toUpperCase()}
                </h3>
                <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>
                  {item.description || ''}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
