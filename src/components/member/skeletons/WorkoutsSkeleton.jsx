export default function WorkoutsSkeleton() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-shimmer" style={{ height: 26, width: 120 }} />
        <div className="skeleton-shimmer" style={{ height: 13, width: 200 }} />
      </div>

      {/* Plan card */}
      {[0, 1].map(i => (
        <div key={i} style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Plan header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton-shimmer" style={{ height: 15, width: '55%' }} />
              <div className="skeleton-shimmer" style={{ height: 12, width: '40%' }} />
            </div>
          </div>
          {/* Day tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[0, 1, 2, 3, 4, 5, 6].map(j => (
              <div key={j} className="skeleton-shimmer" style={{ flex: 1, height: 48, borderRadius: 12 }} />
            ))}
          </div>
          {/* Exercise rows */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(j => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="skeleton-shimmer" style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0 }} />
                <div className="skeleton-shimmer" style={{ flex: 1, height: 14 }} />
                <div className="skeleton-shimmer" style={{ width: 70, height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
