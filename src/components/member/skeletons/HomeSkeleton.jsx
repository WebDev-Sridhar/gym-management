export default function HomeSkeleton() {
  return (
    <div style={{ padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Greeting */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-shimmer" style={{ height: 13, width: 100 }} />
        <div className="skeleton-shimmer" style={{ height: 30, width: 180 }} />
      </div>

      {/* Membership card */}
      <div style={{ borderRadius: 24, padding: 22, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton-shimmer" style={{ height: 11, width: 60 }} />
            <div className="skeleton-shimmer" style={{ height: 20, width: 140 }} />
          </div>
          <div className="skeleton-shimmer" style={{ height: 26, width: 70, borderRadius: 20 }} />
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[80, 70, 60].map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div className="skeleton-shimmer" style={{ height: 10, width: 40 }} />
              <div className="skeleton-shimmer" style={{ height: 14, width: w }} />
            </div>
          ))}
        </div>
      </div>

      {/* Check-in button */}
      <div className="skeleton-shimmer" style={{ height: 56, borderRadius: 20 }} />

      {/* Streak grid */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="skeleton-shimmer" style={{ height: 14, width: 140 }} />
          <div className="skeleton-shimmer" style={{ height: 11, width: 70 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: 10, borderRadius: 3 }} />
          ))}
        </div>
      </div>

      {/* Plans section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <div className="skeleton-shimmer" style={{ height: 14, width: 80 }} />
          <div className="skeleton-shimmer" style={{ height: 13, width: 60 }} />
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton-shimmer" style={{ height: 14, width: '60%' }} />
              <div className="skeleton-shimmer" style={{ height: 12, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
