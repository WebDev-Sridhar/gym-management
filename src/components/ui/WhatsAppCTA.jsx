import { MessageCircle } from 'lucide-react'

// V3 Task 8 + Task 12: "💬 WhatsApp us" link that opens wa.me with a
// pre-filled message. Reuses the same VITE_SUPPORT_WHATSAPP env var as
// UpgradeRequiredModal. Renders nothing if the env var is unset (so
// preview deploys don't ship a broken link to a placeholder number).
//
// Per Pricing Review V2 §11: TN gym owners prefer WhatsApp DM over web
// forms by ~10x. This CTA is the primary acquisition path for Tamil-
// speaking owners who'd otherwise bounce off the email contact form.

const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP || ''

function buildHref(planName) {
  if (!SUPPORT_WHATSAPP) return null
  const digits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')
  const text = planName
    ? `Hi! I'm interested in Gymmobius ${planName} plan for my gym.`
    : "Hi! I'd like to learn more about Gymmobius for my gym."
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/**
 * Props:
 *   planName  — optional, pre-fills the message ("interested in Gymmobius Pro")
 *   variant   — 'solid' | 'ghost' | 'link' (default 'ghost')
 *   className — appended to the computed classes
 */
export default function WhatsAppCTA({ planName, variant = 'ghost', className = '', label = 'WhatsApp us' }) {
  const href = buildHref(planName)
  if (!href) return null

  const base = 'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer transition'
  const variants = {
    solid: 'px-4 py-2.5 rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-600',
    ghost: 'px-4 py-2.5 rounded-xl text-sm border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10',
    link:  'text-sm text-emerald-600 hover:text-emerald-700 hover:underline',
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant] ?? variants.ghost} ${className}`}
    >
      <MessageCircle size={16} />
      {label}
    </a>
  )
}
