import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'
import StatCounter from '../ui/StatCounter'

export default function StatsSection({ defaults, content }) {
  // Per-field fallback: use CMS field if typed, else fall back to that field's default
  const stats = Array.from({ length: 4 }, (_, i) => {
    const cms = content?.stats?.[i]
    return {
      value: cms?.value?.trim() || defaults.stats[i].value,
      label: cms?.label?.trim() || defaults.stats[i].label,
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
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="flex flex-col items-center justify-center py-8 relative"
            >
              {/* Vertical dividers */}
              {i < 3 && (
                <div
                  className="absolute right-0 top-1/4 bottom-1/4 w-px hidden lg:block"
                  style={{ background: 'var(--gym-border)' }}
                />
              )}
              {i === 1 && (
                <div
                  className="absolute right-0 top-1/4 bottom-1/4 w-px block lg:hidden"
                  style={{ background: 'var(--gym-border)' }}
                />
              )}
              <StatCounter value={stat.value} label={stat.label} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
