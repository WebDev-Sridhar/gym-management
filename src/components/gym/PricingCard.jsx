import { motion } from 'framer-motion'
import { fadeUp, hoverLift } from '../../lib/animations'

export default function PricingCard({ plan, themeColor }) {
  const isPopular = plan.is_popular

  return (
    <motion.div
      variants={fadeUp}
      whileHover={hoverLift}
      className={`
        relative rounded-2xl p-6 flex flex-col transition-shadow duration-300
        ${isPopular
          ? 'border-2 shadow-lg hover:shadow-2xl bg-white'
          : 'border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-xl'
        }
      `}
      style={isPopular ? { borderColor: 'var(--gym-primary, ' + themeColor + ')' } : undefined}
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold text-white shadow-md"
          style={{ background: 'var(--gym-gradient, ' + themeColor + ')' }}
        >
          Most Popular
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>

      {/* Duration */}
      {plan.duration_label && (
        <p className="text-sm text-gray-500 mt-1">{plan.duration_label}</p>
      )}

      {/* Price */}
      <div className="mt-4 mb-6">
        <span className="text-4xl font-extrabold text-gray-900">
          {'\u20B9'}{plan.price.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Features */}
      {plan.features?.length > 0 && (
        <ul className="space-y-3 mb-6 flex-1">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                style={{ color: 'var(--gym-primary, ' + themeColor + ')' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer"
        style={
          isPopular
            ? { background: 'var(--gym-gradient, ' + themeColor + ')', color: '#fff', boxShadow: '0 4px 14px rgba(var(--gym-primary-rgb, 139, 92, 246), 0.3)' }
            : { border: '2px solid var(--gym-primary, ' + themeColor + ')', color: 'var(--gym-primary, ' + themeColor + ')' }
        }
      >
        Get Started
      </motion.button>
    </motion.div>
  )
}
