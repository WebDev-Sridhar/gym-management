export default function MembersSkeleton() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Page heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-shimmer" style={{ height: 22, width: 120 }} />
        <div className="skeleton-shimmer" style={{ height: 13, width: 200 }} />
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '10px 14px',
      }}>
        <div className="skeleton-shimmer" style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0 }} />
        <div className="skeleton-shimmer" style={{ flex: 1, height: 14 }} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[80, 70, 80, 80].map((w, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 30, width: w, borderRadius: 20 }} />
        ))}
      </div>

      {/* Member rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18,
          }}>
            <div className="skeleton-shimmer" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton-shimmer" style={{ height: 14, width: '50%' }} />
              <div className="skeleton-shimmer" style={{ height: 11, width: '70%' }} />
            </div>
            <div className="skeleton-shimmer" style={{ height: 24, width: 60, borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
