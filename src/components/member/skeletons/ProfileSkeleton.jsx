export default function ProfileSkeleton() {
  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Avatar + name */}
      <div style={{ textAlign: 'center', paddingBottom: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="skeleton-shimmer" style={{ width: 76, height: 76, borderRadius: '50%' }} />
        <div className="skeleton-shimmer" style={{ height: 22, width: 140 }} />
        <div className="skeleton-shimmer" style={{ height: 13, width: 110 }} />
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, padding: '14px 8px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="skeleton-shimmer" style={{ height: 26, width: 40 }} />
            <div className="skeleton-shimmer" style={{ height: 11, width: 60 }} />
          </div>
        ))}
      </div>

      {/* Membership card */}
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '4px 16px' }}>
        {[0, 1, 2, 3].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div className="skeleton-shimmer" style={{ height: 13, width: 50 }} />
            <div className="skeleton-shimmer" style={{ height: 13, width: 100 }} />
          </div>
        ))}
      </div>

      {/* Contact card */}
      <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '4px 16px' }}>
        {[0, 1].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div className="skeleton-shimmer" style={{ height: 13, width: 45 }} />
            <div className="skeleton-shimmer" style={{ height: 13, width: 130 }} />
          </div>
        ))}
      </div>

      {/* Logout button */}
      <div className="skeleton-shimmer" style={{ height: 50, borderRadius: 16 }} />
    </div>
  )
}
