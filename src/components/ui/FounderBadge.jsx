import { Sparkles } from 'lucide-react'

// V3 Task 11: shown next to the plan name on SubscriptionPage when the
// subscription is in the first-100 founder pricing program. The tooltip
// renders the lock-in end date (founder_pricing_until) so owners know
// when renewals revert to standard pricing.
//
// Minimal by design — the strikethrough price + "Founder pricing" copy on
// the plans grid (Task 8) is the conversion surface; this is just the
// "you have it" reminder on the status card.

function fmtFounderEnd(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default function FounderBadge({ until, className = '' }) {
  const endLabel = fmtFounderEnd(until)
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 ${className}`}
      title={endLabel ? `50% founder pricing until ${endLabel}` : '50% founder pricing'}
    >
      <Sparkles size={10} />
      Founder
    </span>
  )
}
