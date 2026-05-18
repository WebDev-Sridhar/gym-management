import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ChevronRight } from 'lucide-react'

/**
 * DashboardBanner — premium SaaS contextual banner / CTA.
 *
 * Three visual variants × five semantic colors. Designed to feel like
 * Stripe / Linear / Vercel — never marketing-hero loud.
 *
 * Props:
 *   variant         — 'setup' | 'warning' | 'success' | 'info' | 'upgrade'
 *   backgroundType  — 'gradient' | 'glass' | 'soft' (default by variant)
 *   label           — short caps label above title ("SETUP REQUIRED")
 *   title           — bold heading
 *   description     — single paragraph (1–2 lines on desktop)
 *   icon            — lucide-react component (optional)
 *   ctaLabel        — primary button text
 *   ctaAction       — onClick OR string (string = navigate())
 *   secondaryAction — { label, action }
 *   illustration    — small JSX accent shown on the right (optional)
 *   dismissible     — show X to hide (default false; setup banners shouldn't dismiss)
 *   onDismiss       — called when X clicked
 *   visible         — render gate (default true)
 *   compact         — shorter padding for inline placement
 */

const VARIANTS = {
  setup: {
    label: 'text-indigo-700',
    title: 'text-gray-900',
    desc:  'text-gray-600',
    iconBg: 'bg-indigo-100 text-indigo-600',
    cta:    'bg-indigo-600 hover:bg-indigo-700 text-white',
    accent: 'from-indigo-100 via-white to-violet-50',
    border: 'border-indigo-100',
    orb:    'bg-indigo-200/30',
  },
  warning: {
    label: 'text-amber-700',
    title: 'text-gray-900',
    desc:  'text-gray-600',
    iconBg: 'bg-amber-100 text-amber-700',
    cta:    'bg-amber-600 hover:bg-amber-700 text-white',
    accent: 'from-amber-50 via-white to-orange-50',
    border: 'border-amber-100',
    orb:    'bg-amber-200/30',
  },
  success: {
    label: 'text-emerald-700',
    title: 'text-gray-900',
    desc:  'text-gray-600',
    iconBg: 'bg-emerald-100 text-emerald-700',
    cta:    'bg-emerald-600 hover:bg-emerald-700 text-white',
    accent: 'from-emerald-50 via-white to-teal-50',
    border: 'border-emerald-100',
    orb:    'bg-emerald-200/30',
  },
  info: {
    label: 'text-blue-700',
    title: 'text-gray-900',
    desc:  'text-gray-600',
    iconBg: 'bg-blue-100 text-blue-700',
    cta:    'bg-gray-900 hover:bg-black text-white',
    accent: 'from-blue-50 via-white to-indigo-50',
    border: 'border-blue-100',
    orb:    'bg-blue-200/25',
  },
  upgrade: {
    label: 'text-violet-700',
    title: 'text-gray-900',
    desc:  'text-gray-600',
    iconBg: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white',
    cta:    'bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white',
    accent: 'from-indigo-100 via-white to-violet-100',
    border: 'border-indigo-100',
    orb:    'bg-violet-200/30',
  },
}

const DEFAULT_BG = {
  setup: 'gradient', warning: 'soft', success: 'soft', info: 'glass', upgrade: 'gradient',
}

export default function DashboardBanner({
  variant         = 'setup',
  backgroundType,
  label,
  title,
  description,
  icon: Icon,
  ctaLabel,
  ctaAction,
  secondaryAction,
  illustration,
  dismissible     = false,
  onDismiss,
  visible         = true,
  compact         = false,
}) {
  const v   = VARIANTS[variant] || VARIANTS.setup
  const bg  = backgroundType || DEFAULT_BG[variant] || 'gradient'

  // Surface styles per backgroundType
  const surface =
    bg === 'gradient'
      ? `bg-gradient-to-br ${v.accent} border ${v.border}`
      : bg === 'glass'
        ? `bg-white/80 backdrop-blur-xl border ${v.border}`
        : `bg-white border ${v.border}`

  const orb =
    bg === 'gradient' && (
      <>
        <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full ${v.orb} blur-3xl pointer-events-none`} />
        <div className={`absolute -left-12 -bottom-12 w-32 h-32 rounded-full ${v.orb} blur-3xl pointer-events-none opacity-60`} />
      </>
    )

  const padding = compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className={`relative overflow-hidden rounded-3xl ${surface} ${padding}`}
        >
          {orb}

          <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            {/* Left: icon + text */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              {Icon && (
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${v.iconBg}`}>
                  <Icon size={18} strokeWidth={2} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {label && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${v.label}`}>{label}</p>
                )}
                <h3 className={`text-sm sm:text-base font-bold leading-snug ${v.title}`}>{title}</h3>
                {description && (
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${v.desc}`}>{description}</p>
                )}
              </div>
            </div>

            {/* Right: actions + optional illustration */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0 flex-wrap">
              {illustration && (
                <div className="hidden md:block opacity-90">{illustration}</div>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.action}
                  className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors cursor-pointer"
                >
                  {secondaryAction.label}
                </button>
              )}
              {ctaLabel && ctaAction && (
                <button
                  onClick={ctaAction}
                  className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm ${v.cta} whitespace-nowrap`}
                >
                  {ctaLabel}
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {/* Dismiss */}
            {dismissible && (
              <button
                onClick={onDismiss}
                aria-label="Dismiss"
                className="absolute top-3 right-3 md:static md:order-last w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────────────────────────────────────────────────────────────────────
   Lighter inline variant — for in-page hints (e.g. analytics page hint).
   Renders as a slim row, no orb, minimal padding.
   ─────────────────────────────────────────────────────────────────────── */
export function InlineBannerLink({ icon: Icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all group text-left cursor-pointer"
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-indigo-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{title}</p>
        {description && <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
    </button>
  )
}
