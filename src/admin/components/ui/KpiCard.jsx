import Sk from './Sk'

/**
 * KPI tile for the dashboard. `tone` colors the icon chip + optional value
 * emphasis; `alert` (red) is used for failure/issue counts > 0.
 */
export default function KpiCard({ label, value, sub, Icon, loading, tone = 'indigo', alert = false }) {
  const tones = {
    indigo: { bg: 'var(--a-tone-indigo-bg)', fg: 'var(--a-tone-indigo-fg)' },
    green:  { bg: 'var(--a-tone-green-bg)',  fg: 'var(--a-tone-green-fg)' },
    amber:  { bg: 'var(--a-tone-amber-bg)',  fg: 'var(--a-tone-amber-fg)' },
    red:    { bg: 'var(--a-tone-red-bg)',    fg: 'var(--a-tone-red-fg)' },
  }
  const t = tones[tone] || tones.indigo

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--a-surface)', borderColor: alert ? 'rgba(239,68,68,0.35)' : 'var(--a-border)' }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs" style={{ color: 'var(--a-text-dim)' }}>{label}</p>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: t.bg }}>
            <Icon className="h-4 w-4" style={{ color: t.fg }} />
          </span>
        )}
      </div>
      <div className="mt-2">
        {loading
          ? <Sk h={22} w={70} />
          : <p className="text-xl font-bold" style={{ color: alert && value ? 'var(--a-tone-red-fg)' : 'var(--a-text)' }}>{value}</p>}
      </div>
      {sub && !loading && <p className="mt-1 text-xs" style={{ color: 'var(--a-text-faint)' }}>{sub}</p>}
    </div>
  )
}
