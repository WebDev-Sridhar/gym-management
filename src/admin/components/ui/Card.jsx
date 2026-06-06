/** Panel surface used across admin pages. */
export default function Card({ children, className = '', padded = true, style = {} }) {
  return (
    <div
      className={`rounded-xl border ${padded ? 'p-5' : ''} ${className}`}
      style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)', ...style }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>{children}</h2>
      {action}
    </div>
  )
}
