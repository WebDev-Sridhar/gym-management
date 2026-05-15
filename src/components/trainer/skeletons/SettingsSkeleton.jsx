export default function SettingsSkeleton() {
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Avatar + identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 12 }}>
        <div className="skeleton-shimmer-dark" style={{ width: 72, height: 72, borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="skeleton-shimmer-dark" style={{ height: 20, width: 140 }} />
          <div className="skeleton-shimmer-dark" style={{ height: 22, width: 70, borderRadius: 20 }} />
        </div>
      </div>

      {/* Profile fields card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, overflow: 'hidden',
      }}>
        {[0, 1, 2, 3].map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <div className="skeleton-shimmer-dark" style={{ height: 13, width: 50 }} />
            <div className="skeleton-shimmer-dark" style={{ height: 13, width: 120 }} />
          </div>
        ))}
      </div>

      {/* Sign out button */}
      <div className="skeleton-shimmer-dark" style={{ height: 48, borderRadius: 16 }} />
    </div>
  )
}
