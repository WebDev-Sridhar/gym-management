import { useAuth } from '../../store/AuthContext'
import SettingsSkeleton from '../../components/trainer/skeletons/SettingsSkeleton'

export default function TrainerSettingsPage() {
  const { profile, gymId, gymSlug, logout } = useAuth()

  async function handleLogout() {
    // Snapshot the slug BEFORE logout — AuthContext gets cleared.
    const slug = gymSlug
    try { await logout() } catch (e) { console.error(e); return }
    // HARD navigation. ProtectedRoute's <Navigate to="/login"/> fires
    // during render the moment session clears and beats any imperative
    // react-router navigate(). window.location.assign sidesteps the race.
    window.location.assign(slug ? `/${slug}/login` : '/login')
  }

  if (!profile) return <SettingsSkeleton />

  const fields = [
    { label: 'Name',   value: profile?.name  || '—' },
    { label: 'Phone',  value: profile?.phone  || '—' },
    { label: 'Email',  value: profile?.email  || '—' },
    { label: 'Gym ID', value: gymId            || '—' },
  ]

  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Avatar + identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          boxShadow: '0 0 0 4px rgba(129,140,248,0.12), 0 0 24px rgba(99,102,241,0.3)',
        }}>
          {profile?.name?.charAt(0).toUpperCase() || 'T'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#f5f5f7', margin: 0, letterSpacing: '-0.3px' }}>
            {profile?.name || 'Trainer'}
          </p>
          <span style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 11, fontWeight: 700,
            color: '#818cf8', background: 'rgba(129,140,248,0.15)',
            padding: '3px 10px', borderRadius: 20,
            letterSpacing: '0.3px', textTransform: 'uppercase',
          }}>
            Trainer
          </span>
        </div>
      </div>

      {/* Profile fields */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {fields.map(({ label, value }, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#f5f5f7',
              maxWidth: '60%', textAlign: 'right',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Info note */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
        To update your profile, contact your gym owner
      </p>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '14px', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 16, background: 'rgba(248,113,113,0.06)',
          color: '#f87171', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.1px',
          transition: 'background 0.15s',
        }}
      >
        Sign Out
      </button>

      {/* Footer */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', textAlign: 'center', margin: '4px 0 0', letterSpacing: '0.2px' }}>
        Powered by Gymmobius
      </p>
    </div>
  )
}
