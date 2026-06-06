/** Formatting helpers shared across admin pages. */

export function inr(amount, { compact = false } = {}) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  if (compact && Math.abs(n) >= 100000) {
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
    return `₹${(n / 100000).toFixed(2)}L`
  }
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function num(n) {
  const v = Number(n)
  return Number.isFinite(v) ? v.toLocaleString('en-IN') : '0'
}

export function date(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return '—'
  const diff = Date.now() - d
  const abs = Math.abs(diff)
  const sign = diff >= 0 ? 'ago' : 'from now'
  const mins = Math.round(abs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ${sign}`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ${sign}`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ${sign}`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ${sign}`
  return `${Math.round(months / 12)}y ${sign}`
}

export function daysUntil(iso) {
  if (!iso) return null
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return null
  return Math.ceil((d - Date.now()) / 86400000)
}

const PLAN_LABEL = { free: 'Solo Coach', starter: 'Starter', pro: 'Pro', premium: 'Premium' }
export function planLabel(plan) {
  return PLAN_LABEL[String(plan || '').toLowerCase()] || (plan ?? '—')
}
