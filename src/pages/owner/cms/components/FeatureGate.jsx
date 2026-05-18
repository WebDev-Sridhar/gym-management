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
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/55 dark:bg-black/40 backdrop-blur-[3px] z-10 p-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-md text-left max-w-[340px]">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 relative">
            <Lock size={13} className="text-indigo-600" />
            <Sparkles size={8} className="text-amber-500 absolute -top-0.5 -right-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {required && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded tracking-wide uppercase">
                  {required}
                </span>
              )}
              <span className="text-[11px] font-semibold text-gray-700">Locked</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{message}</p>
          </div>
          <Link
            to="/owner-dashboard/subscription"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            Upgrade
            <ArrowRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  )
}
