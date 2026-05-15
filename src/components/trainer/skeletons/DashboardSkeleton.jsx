export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '20px 16px', paddingBottom: 8 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div className="skeleton-shimmer" style={{ height: 13, width: 140, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 28, width: 200, marginBottom: 6 }} />
        <div className="skeleton-shimmer" style={{ height: 13, width: 170 }} />
      </div>

      {/* Stat cards — 3 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div className="skeleton-shimmer" style={{ width: 36, height: 36, borderRadius: 12 }} />
            <div className="skeleton-shimmer" style={{ height: 24, width: '60%' }} />
            <div className="skeleton-shimmer" style={{ height: 11, width: '80%' }} />
          </div>
        ))}
      </div>

      {/* Quick action cards — 2 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 13 }} />
            <div className="skeleton-shimmer" style={{ height: 14, width: '70%' }} />
            <div className="skeleton-shimmer" style={{ height: 11, width: '90%' }} />
          </div>
        ))}
      </div>

      {/* Members list card */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 22, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div className="skeleton-shimmer" style={{ height: 14, width: 80 }} />
          <div className="skeleton-shimmer" style={{ height: 12, width: 50 }} />
        </div>
        {[0, 1, 2, 3].map((_, idx) => (
          <div key={idx} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div className="skeleton-shimmer" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton-shimmer" style={{ height: 13, width: '55%' }} />
              <div className="skeleton-shimmer" style={{ height: 11, width: '75%' }} />
            </div>
            <div className="skeleton-shimmer" style={{ height: 22, width: 52, borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
