export default function EmptyState({ Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon && <Icon className="h-8 w-8" style={{ color: 'var(--a-text-faint)' }} />}
      <p className="text-sm font-medium" style={{ color: 'var(--a-text-dim)' }}>{title}</p>
      {hint && <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{hint}</p>}
    </div>
  )
}
