export default function PricingCard({ plan, themeColor }) {
  const isPopular = plan.is_popular

  return (
    <div
      className={`
        relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1
        ${isPopular
          ? 'border-2 shadow-md'
          : 'border-gray-200 bg-white'
        }
      `}
      style={isPopular ? { borderColor: themeColor } : undefined}
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: themeColor }}
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
                style={{ color: themeColor }}
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
      <button
        className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 cursor-pointer"
        style={
          isPopular
            ? { backgroundColor: themeColor, color: '#fff' }
            : { border: `2px solid ${themeColor}`, color: themeColor }
        }
      >
        Get Started
      </button>
    </div>
  )
}
