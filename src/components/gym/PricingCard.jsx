import { motion } from 'framer-motion'
import { fadeUp } from '../../lib/animations'

export default function PricingCard({ plan }) {
  const isPopular = plan.is_popular

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative p-7 flex flex-col"
      style={
        isPopular
          ? { background: 'var(--gym-card)', border: '1px solid var(--gym-primary)', borderRadius: 'var(--gym-card-radius)', boxShadow: '0 0 30px var(--gym-glow), var(--gym-shadow)' }
          : { background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)', boxShadow: 'var(--gym-shadow)' }
      }
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold text-white tracking-wider font-sans"
          style={{ background: 'var(--gym-gradient)' }}
        >
          MOST POPULAR
        </div>
      )}

      {/* Plan name */}
      <h3 className="font-display text-white tracking-wider text-2xl mb-1">{plan.name.toUpperCase()}</h3>
      {plan.duration_label && (
        <p className="text-white/35 text-xs uppercase tracking-wider font-sans">{plan.duration_label}</p>
      )}

      {/* Price */}
      <div className="my-7">
        <div className="flex items-end gap-1">
          <span className="text-white/40 text-lg font-sans">₹</span>
          <span className="font-display text-white leading-none" style={{ fontSize: '3.5rem' }}>
            {plan.price.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-6 h-px" style={{ background: 'var(--gym-border)' }} />

      {/* Features */}
      {plan.features?.length > 0 && (
        <ul className="space-y-3.5 mb-8 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/60 font-sans">
              <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--gym-primary)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 font-bold text-sm font-sans transition-all duration-300 cursor-pointer"
        style={
          isPopular
            ? { background: 'var(--gym-gradient)', color: '#fff', boxShadow: '0 6px 20px var(--gym-glow)', borderRadius: 'var(--gym-card-radius)' }
            : { border: '1px solid var(--gym-border-strong)', color: 'var(--gym-text)', background: 'transparent', borderRadius: 'var(--gym-card-radius)' }
        }
      >
        Get Started
      </motion.button>
    </motion.div>
  )
}
