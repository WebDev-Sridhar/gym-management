export default function WorkoutsSkeleton() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Page heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-shimmer-dark" style={{ height: 22, width: 80 }} />
        <div className="skeleton-shimmer-dark" style={{ height: 13, width: 240 }} />
      </div>

      {/* Tab toggle pills */}
      <div style={{
        display: 'flex', gap: 4, padding: 4,
        background: 'rgba(255,255,255,0.05)', borderRadius: 14,
        alignSelf: 'flex-start',
      }}>
        <div className="skeleton-shimmer-dark" style={{ height: 34, width: 110, borderRadius: 10 }} />
        <div className="skeleton-shimmer-dark" style={{ height: 34, width: 110, borderRadius: 10 }} />
      </div>

      {/* Template cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Title + badge */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="skeleton-shimmer-dark" style={{ flex: 1, height: 14 }} />
              <div className="skeleton-shimmer-dark" style={{ width: 54, height: 20, borderRadius: 20 }} />
            </div>
            {/* Description */}
            <div className="skeleton-shimmer-dark" style={{ height: 12, width: '90%' }} />
            <div className="skeleton-shimmer-dark" style={{ height: 12, width: '70%' }} />
            {/* Meta */}
            <div className="skeleton-shimmer-dark" style={{ height: 12, width: 140 }} />
            {/* Day pills */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map(j => (
                <div key={j} className="skeleton-shimmer-dark" style={{ height: 22, width: 36, borderRadius: 20 }} />
              ))}
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <div className="skeleton-shimmer-dark" style={{ flex: 1, height: 34, borderRadius: 12 }} />
              <div className="skeleton-shimmer-dark" style={{ flex: 1, height: 34, borderRadius: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
