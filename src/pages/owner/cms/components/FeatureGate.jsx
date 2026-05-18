import { Link } from 'react-router-dom'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { canAccess, requiredPlan } from '../../../../lib/featureGates'

/**
 * FeatureGate — wraps children with a blurred upgrade prompt for users
 * whose subscription tier doesn't include the feature.
 *
 * Props:
 *   feature   — key from FEATURE_RULES
 *   planName  — raw plan_name from subscriptions table
 *   children  — JSX to gate
 *   hint      — optional message override
 *   minHeight — px floor when children may collapse (e.g. when fetches return empty)
 */
export default function FeatureGate({ feature, planName, children, hint, minHeight }) {
  if (canAccess(feature, planName)) {
    return children
  }

  const required = requiredPlan(feature)
  const message = hint || `Available on the ${required || 'Pro'} plan and above.`

  return (
    <div className="relative" style={minHeight ? { minHeight } : undefined}>
      {/* Blurred placeholder content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(4px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/55 dark:bg-black/40 backdrop-blur-[3px] z-10 p-4">
        <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl bg-white border border-gray-200 shadow-md text-center max-w-[280px]">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 relative">
            <Lock size={15} className="text-indigo-600" />
            <Sparkles size={10} className="text-amber-500 absolute -top-1 -right-1" />
          </div>
          {required && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full tracking-wide uppercase">
              {required} feature
            </span>
          )}
          <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
          <Link
            to="/owner-dashboard/subscription"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Upgrade plan
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}
