import { canAccess, requiredPlan } from '../../../../lib/featureGates'

/**
 * FeatureGate — wraps content that requires a higher plan.
 *
 * Props:
 *   feature   string  — key from featureGates FEATURE_RULES
 *   planName  string  — subscription plan_name
 *   children  node    — the content to gate
 *   hint      string  — optional custom message (overrides default)
 */
export default function FeatureGate({ feature, planName, children, hint }) {
  if (canAccess(feature, planName)) {
    return children
  }

  const required = requiredPlan(feature)
  const message = hint || (required ? `Upgrade to ${required} to unlock this feature.` : 'This feature is not available on your plan.')

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.45 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/60 backdrop-blur-[2px] z-10">
        <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-center max-w-[220px]">
          <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          {required && (
            <span className="text-xs font-bold px-2 py-0.5 bg-violet-600 text-white rounded-full tracking-wide">
              {required}
            </span>
          )}
          <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  )
}
