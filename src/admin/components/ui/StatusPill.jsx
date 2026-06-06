const TONES = {
  green:  { bg: 'var(--a-tone-green-bg)',  fg: 'var(--a-tone-green-fg)' },
  amber:  { bg: 'var(--a-tone-amber-bg)',  fg: 'var(--a-tone-amber-fg)' },
  red:    { bg: 'var(--a-tone-red-bg)',    fg: 'var(--a-tone-red-fg)' },
  gray:   { bg: 'var(--a-tone-gray-bg)',   fg: 'var(--a-tone-gray-fg)' },
  indigo: { bg: 'var(--a-tone-indigo-bg)', fg: 'var(--a-tone-indigo-fg)' },
}

// Common platform statuses → tone. Falls back to gray.
const STATUS_TONE = {
  active: 'green',
  trial: 'indigo',
  pending: 'amber',
  expired: 'red',
  cancelled: 'gray',
  suspended: 'red',
  verified: 'green',
  failed: 'red',
  sent: 'green',
  partial: 'amber',
  skipped: 'gray',
}

export function toneForStatus(status) {
  return STATUS_TONE[String(status || '').toLowerCase()] || 'gray'
}

export default function StatusPill({ status, tone, label, dot = true }) {
  const t = TONES[tone || toneForStatus(status)] || TONES.gray
  const text = label ?? (status ? String(status) : '—')
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ background: t.bg, color: t.fg }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.fg }} />}
      {text}
    </span>
  )
}
